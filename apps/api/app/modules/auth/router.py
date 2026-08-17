from __future__ import annotations

import base64
import binascii
import hashlib
import hmac
import json
import re
import secrets
from datetime import UTC, datetime
from threading import RLock
from typing import Any
from uuid import uuid4

from fastapi import APIRouter, Depends, Header, HTTPException, Request, Response
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.audit import record_audit_event
from app.core.config import settings
from app.core.rate_limit import clear_rate_limit, enforce_rate_limit, reset_rate_limits_for_tests
from app.core.seed import load_seed
from app.db.session import get_db
from app.models.user import User


router = APIRouter(prefix="/auth", tags=["auth"])
ROLES = {
    "owner",
    "citizen",
    "municipality_admin",
    "decision_maker",
    "analyst",
    "police",
    "red_cross",
    "civil_defense",
}
EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
TOKEN_ALGORITHM = "HS256"
UNSAFE_METHODS = {"POST", "PUT", "PATCH", "DELETE"}
_users: list[dict[str, Any]] | None = None
_users_lock = RLock()


class LoginRequest(BaseModel):
    email: str = Field(min_length=5, max_length=255)
    password: str = Field(min_length=8, max_length=128)

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        normalized = value.strip().lower()
        if not EMAIL_PATTERN.fullmatch(normalized):
            raise ValueError("Enter a valid email address")
        return normalized


class RegisterRequest(LoginRequest):
    full_name: str = Field(min_length=2, max_length=255)

    @field_validator("full_name")
    @classmethod
    def normalize_full_name(cls, value: str) -> str:
        normalized = " ".join(value.split())
        if len(normalized) < 2:
            raise ValueError("Full name must contain at least two visible characters")
        return normalized


def _load_seed() -> dict[str, Any]:
    return load_seed()


def user_store() -> list[dict[str, Any]]:
    global _users
    with _users_lock:
        if _users is None:
            _users = [
                {
                    **dict(user),
                    "token_version": int(user.get("token_version", 0)),
                    "tenant_key": str(user.get("tenant_key", "citymind-tripoli")),
                }
                for user in _load_seed()["users"]
            ]
        return _users


def reset_user_store_for_tests() -> None:
    global _users
    with _users_lock:
        _users = None
    reset_rate_limits_for_tests()


def _database_user_to_dict(user: User) -> dict[str, Any]:
    return {
        "id": user.id,
        "full_name": user.full_name,
        "email": user.email,
        "password_hash": user.password_hash,
        "role": user.role,
        "is_active": user.is_active,
        "token_version": user.token_version,
        "tenant_key": user.tenant_key,
    }


def _find_user(db: Session, email: str) -> dict[str, Any] | None:
    normalized_email = email.strip().lower()
    if settings.operational_persistence_backend == "database":
        user = db.scalar(select(User).where(User.email == normalized_email))
        return _database_user_to_dict(user) if user else None
    with _users_lock:
        stored = next((item for item in user_store() if item["email"].lower() == normalized_email), None)
        return dict(stored) if stored else None


def list_users(db: Session) -> list[dict[str, Any]]:
    if settings.operational_persistence_backend == "database":
        return [_public_user(_database_user_to_dict(user)) for user in db.scalars(select(User).order_by(User.email)).all()]
    with _users_lock:
        return [_public_user(user) for user in user_store()]


def list_local_users() -> list[dict[str, Any]]:
    with _users_lock:
        return [_public_user(user) for user in user_store()]


def upsert_user_record(
    db: Session,
    *,
    email: str,
    full_name: str,
    role: str,
    is_active: bool = True,
    password: str | None = None,
) -> dict[str, Any]:
    if role not in ROLES:
        raise HTTPException(status_code=422, detail="Unsupported CityMind role")

    normalized_email = email.strip().lower()
    if not EMAIL_PATTERN.fullmatch(normalized_email):
        raise HTTPException(status_code=422, detail="Enter a valid email address")

    if settings.operational_persistence_backend == "database":
        existing = db.scalar(select(User).where(User.email == normalized_email))
        if existing is None:
            if not password:
                raise HTTPException(status_code=422, detail="A password is required when creating a user")
            existing = User(
                full_name=full_name.strip() or normalized_email,
                email=normalized_email,
                password_hash=_hash_password(password),
                role=role,
                is_active=is_active,
            )
            db.add(existing)
        else:
            security_changed = existing.role != role or existing.is_active != is_active or password is not None
            existing.full_name = full_name.strip() or existing.full_name
            existing.role = role
            existing.is_active = is_active
            if password:
                existing.password_hash = _hash_password(password)
            if security_changed:
                existing.token_version += 1
        db.commit()
        db.refresh(existing)
        return _public_user(_database_user_to_dict(existing))

    return upsert_local_user(
        email=normalized_email,
        full_name=full_name,
        role=role,
        is_active=is_active,
        password=password,
    )


def upsert_local_user(
    email: str,
    full_name: str,
    role: str,
    is_active: bool = True,
    password: str | None = None,
) -> dict[str, Any]:
    if role not in ROLES:
        raise HTTPException(status_code=422, detail="Unsupported CityMind role")
    normalized_email = email.strip().lower()
    if not EMAIL_PATTERN.fullmatch(normalized_email):
        raise HTTPException(status_code=422, detail="Enter a valid email address")

    with _users_lock:
        users = user_store()
        existing = next((item for item in users if item["email"].lower() == normalized_email), None)
        if existing is None:
            if not password:
                raise HTTPException(status_code=422, detail="A password is required when creating a user")
            existing = {
                "full_name": full_name.strip() or normalized_email,
                "email": normalized_email,
                "role": role,
                "is_active": is_active,
                "password_hash": _hash_password(password),
                "token_version": 0,
                "tenant_key": "citymind-tripoli",
            }
            users.append(existing)
        else:
            security_changed = existing["role"] != role or existing["is_active"] != is_active or password is not None
            existing["full_name"] = full_name.strip() or existing["full_name"]
            existing["role"] = role
            existing["is_active"] = is_active
            if password:
                existing["password_hash"] = _hash_password(password)
            if security_changed:
                existing["token_version"] = int(existing.get("token_version", 0)) + 1
        return _public_user(existing)


def create_citizen_user(db: Session, email: str, full_name: str, password: str) -> dict[str, Any]:
    normalized_email = email.strip().lower()
    if settings.operational_persistence_backend == "database":
        if db.scalar(select(User.id).where(User.email == normalized_email)) is not None:
            raise HTTPException(status_code=409, detail="Email is already registered")
        user = User(
            full_name=full_name.strip() or normalized_email,
            email=normalized_email,
            password_hash=_hash_password(password),
            role="citizen",
            is_active=True,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        return _database_user_to_dict(user)

    with _users_lock:
        users = user_store()
        if any(item["email"].lower() == normalized_email for item in users):
            raise HTTPException(status_code=409, detail="Email is already registered")
        user = {
            "full_name": full_name.strip() or normalized_email,
            "email": normalized_email,
            "role": "citizen",
            "is_active": True,
            "password_hash": _hash_password(password),
            "token_version": 0,
            "tenant_key": "citymind-tripoli",
        }
        users.append(user)
        return user


def _public_user(user: dict[str, Any]) -> dict[str, Any]:
    return {
        "full_name": user["full_name"],
        "email": user["email"],
        "role": user["role"],
        "is_active": user["is_active"],
    }


def _hash_password(password: str, salt: str | None = None) -> str:
    password_salt = salt or secrets.token_urlsafe(16)
    iterations = settings.password_hash_iterations
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), password_salt.encode(), iterations)
    return f"pbkdf2_sha256${iterations}${password_salt}${base64.b64encode(digest).decode()}"


def _verify_password(password: str, password_hash: str | None, _: str = "") -> bool:
    if not password_hash:
        return False
    try:
        algorithm, iterations_text, salt, expected = password_hash.split("$", 3)
        iterations = int(iterations_text)
    except (TypeError, ValueError):
        return False
    if algorithm != "pbkdf2_sha256" or iterations < 120_000 or iterations > 1_000_000:
        return False
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), iterations)
    actual = base64.b64encode(digest).decode()
    return hmac.compare_digest(actual, expected)


DUMMY_PASSWORD_HASH = _hash_password("invalid-password", salt="citymind-constant-time-dummy")


def _base64url_encode(value: bytes) -> str:
    return base64.urlsafe_b64encode(value).rstrip(b"=").decode("ascii")


def _base64url_decode(value: str) -> bytes:
    padding = "=" * (-len(value) % 4)
    return base64.urlsafe_b64decode(f"{value}{padding}".encode("ascii"))


def _encode_access_token(
    user: dict[str, Any],
    now: datetime | None = None,
    *,
    csrf_token: str | None = None,
) -> str:
    issued_at = now or datetime.now(UTC)
    issued_timestamp = int(issued_at.timestamp())
    csrf_value = csrf_token or secrets.token_urlsafe(24)
    header = {"alg": TOKEN_ALGORITHM, "typ": "JWT"}
    payload = {
        "sub": user["email"],
        "role": user["role"],
        "tenant": user.get("tenant_key", "citymind-tripoli"),
        "ver": int(user.get("token_version", 0)),
        "csrf": csrf_value,
        "iss": settings.auth_token_issuer,
        "iat": issued_timestamp,
        "exp": issued_timestamp + settings.auth_token_ttl_seconds,
        "jti": str(uuid4()),
    }
    encoded_header = _base64url_encode(json.dumps(header, separators=(",", ":"), sort_keys=True).encode())
    encoded_payload = _base64url_encode(json.dumps(payload, separators=(",", ":"), sort_keys=True).encode())
    signing_input = f"{encoded_header}.{encoded_payload}".encode("ascii")
    signature = hmac.new(
        settings.auth_token_secret.get_secret_value().encode(),
        signing_input,
        hashlib.sha256,
    ).digest()
    return f"{encoded_header}.{encoded_payload}.{_base64url_encode(signature)}"


def _decode_access_token(token: str, now: datetime | None = None) -> dict[str, Any]:
    if len(token) > 4096:
        raise HTTPException(status_code=401, detail="Invalid access token")
    try:
        encoded_header, encoded_payload, encoded_signature = token.split(".")
        header = json.loads(_base64url_decode(encoded_header))
        payload = json.loads(_base64url_decode(encoded_payload))
        supplied_signature = _base64url_decode(encoded_signature)
    except (ValueError, TypeError, binascii.Error, json.JSONDecodeError, UnicodeDecodeError) as exc:
        raise HTTPException(status_code=401, detail="Invalid access token") from exc
    if header != {"alg": TOKEN_ALGORITHM, "typ": "JWT"}:
        raise HTTPException(status_code=401, detail="Invalid access token")
    signing_input = f"{encoded_header}.{encoded_payload}".encode("ascii")
    expected_signature = hmac.new(
        settings.auth_token_secret.get_secret_value().encode(),
        signing_input,
        hashlib.sha256,
    ).digest()
    if not hmac.compare_digest(supplied_signature, expected_signature):
        raise HTTPException(status_code=401, detail="Invalid access token")
    current_timestamp = int((now or datetime.now(UTC)).timestamp())
    try:
        claims = {
            "email": str(payload["sub"]),
            "role": str(payload["role"]),
            "tenant": str(payload["tenant"]),
            "token_version": int(payload["ver"]),
            "csrf": str(payload["csrf"]),
        }
        expires_at = int(payload["exp"])
        issued_at = int(payload["iat"])
    except (KeyError, TypeError, ValueError) as exc:
        raise HTTPException(status_code=401, detail="Invalid access token") from exc
    if payload.get("iss") != settings.auth_token_issuer or claims["role"] not in ROLES:
        raise HTTPException(status_code=401, detail="Invalid access token")
    if issued_at > current_timestamp + 30 or expires_at <= current_timestamp:
        raise HTTPException(status_code=401, detail="Expired or invalid access token")
    return claims


def _set_auth_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key=settings.auth_cookie_name,
        value=token,
        max_age=settings.auth_token_ttl_seconds,
        httponly=True,
        secure=settings.auth_cookie_secure,
        samesite=settings.auth_cookie_same_site,
        domain=settings.auth_cookie_domain,
        path="/",
    )


def _auth_response(user: dict[str, Any], response: Response) -> dict[str, Any]:
    csrf_token = secrets.token_urlsafe(24)
    access_token = _encode_access_token(user, csrf_token=csrf_token)
    _set_auth_cookie(response, access_token)
    return {
        "access_token": access_token,
        "csrf_token": csrf_token,
        "token_type": "bearer",
        "expires_in": settings.auth_token_ttl_seconds,
        "user": _public_user(user),
        "production_ready": settings.is_production and settings.operational_persistence_backend == "database",
    }


@router.post("/login")
def login(
    payload: LoginRequest,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    enforce_rate_limit(
        request,
        db,
        scope="auth.login.ip",
        identity=None,
        limit=settings.login_ip_max_attempts,
        window_seconds=settings.login_window_seconds,
    )
    enforce_rate_limit(
        request,
        db,
        scope="auth.login.account",
        identity=payload.email,
        limit=settings.login_max_attempts,
        window_seconds=settings.login_window_seconds,
    )
    user = _find_user(db, payload.email)
    supplied_hash = user.get("password_hash") if user else DUMMY_PASSWORD_HASH
    password_is_valid = _verify_password(payload.password, supplied_hash, payload.email)
    if user is None or not user["is_active"] or not password_is_valid:
        record_audit_event(
            db,
            request,
            action="auth.login_failed",
            resource_type="user",
            actor_email=payload.email,
        )
        db.commit()
        raise HTTPException(status_code=401, detail="Invalid email or password")
    clear_rate_limit(request, db, scope="auth.login.account", identity=payload.email)
    record_audit_event(
        db,
        request,
        action="auth.login_succeeded",
        resource_type="user",
        actor_email=user["email"],
        resource_id=user["email"],
    )
    db.commit()
    return _auth_response(user, response)


@router.post("/register", status_code=201)
def register(
    payload: RegisterRequest,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    enforce_rate_limit(
        request,
        db,
        scope="auth.register",
        identity=payload.email,
        limit=settings.register_max_attempts,
        window_seconds=settings.public_query_window_seconds,
    )
    try:
        user = create_citizen_user(db, payload.email, payload.full_name, payload.password)
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=409, detail="Email is already registered") from exc
    record_audit_event(
        db,
        request,
        action="auth.registered",
        resource_type="user",
        actor_email=user["email"],
        resource_id=user["email"],
    )
    db.commit()
    return _auth_response(user, response)


def current_user(
    request: Request,
    authorization: str | None = Header(default=None),
    csrf_token: str | None = Header(default=None, alias="X-CSRF-Token"),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    bearer_token = None
    if authorization and authorization.lower().startswith("bearer "):
        candidate = authorization.split(" ", 1)[1].strip()
        bearer_token = candidate or None
    cookie_token = request.cookies.get(settings.auth_cookie_name)
    token = bearer_token or cookie_token
    if not token:
        raise HTTPException(status_code=401, detail="Missing access token")
    claims = _decode_access_token(token)
    user = _find_user(db, claims["email"])
    if (
        user is None
        or not user["is_active"]
        or user["role"] != claims["role"]
        or user.get("tenant_key", "citymind-tripoli") != claims["tenant"]
        or int(user.get("token_version", 0)) != claims["token_version"]
    ):
        raise HTTPException(status_code=401, detail="User is inactive or access has changed")
    if bearer_token is None and request.method.upper() in UNSAFE_METHODS:
        if not csrf_token or not hmac.compare_digest(csrf_token, claims["csrf"]):
            raise HTTPException(status_code=403, detail="CSRF token is missing or invalid")
    return claims


@router.get("/me")
def me(user: dict[str, Any] = Depends(current_user), db: Session = Depends(get_db)) -> dict[str, Any]:
    stored_user = _find_user(db, user["email"])
    if stored_user is None:
        raise HTTPException(status_code=401, detail="User is unavailable")
    return _public_user(stored_user)


@router.post("/logout", status_code=204, response_class=Response)
def logout(
    request: Request,
    response: Response,
    user: dict[str, Any] = Depends(current_user),
    db: Session = Depends(get_db),
) -> Response:
    if settings.operational_persistence_backend == "database":
        stored = db.scalar(select(User).where(User.email == user["email"]))
        if stored:
            stored.token_version += 1
    else:
        with _users_lock:
            stored = next((item for item in user_store() if item["email"].lower() == user["email"].lower()), None)
            if stored:
                stored["token_version"] = int(stored.get("token_version", 0)) + 1
    record_audit_event(
        db,
        request,
        action="auth.logged_out",
        resource_type="user",
        actor_email=user["email"],
        resource_id=user["email"],
    )
    db.commit()
    response.delete_cookie(
        settings.auth_cookie_name,
        domain=settings.auth_cookie_domain,
        path="/",
        secure=settings.auth_cookie_secure,
        httponly=True,
        samesite=settings.auth_cookie_same_site,
    )
    response.status_code = 204
    return response


def require_roles(*roles: str):
    def dependency(user: dict[str, Any] = Depends(current_user)) -> dict[str, Any]:
        if user["role"] not in roles:
            raise HTTPException(status_code=403, detail="Insufficient CityMind role")
        return user

    return dependency

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

from fastapi import APIRouter, BackgroundTasks, Depends, Header, HTTPException, Query, Request, Response
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.action_tokens import ActionTokenError, binding_for, create_action_token, read_action_token
from app.core.audit import record_audit_event
from app.core.config import settings
from app.core.email import (
    already_registered_email,
    password_changed_email,
    password_reset_email,
    send_email,
    verification_email,
)
from app.core.rate_limit import clear_rate_limit, enforce_rate_limit, reset_rate_limits_for_tests
from app.core.security import (
    PasswordPolicyError,
    dummy_password_hash,
    hash_password,
    needs_rehash,
    validate_password_strength,
    verify_password,
)
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
CONTROL_CHARACTERS = re.compile(r"[\x00-\x1f\x7f]")
TOKEN_ALGORITHM = "HS256"
UNSAFE_METHODS = {"POST", "PUT", "PATCH", "DELETE"}
FULL_NAME_MAX_LENGTH = 160  # users.full_name is VARCHAR(160)
EMAIL_NOT_VERIFIED_DETAIL = "Email address is not verified. Follow the link we emailed you, or request a new one."
PRE_HIJACK_DETAIL = (
    "This email already belongs to a self-registered account. Set a new password when granting it a "
    "staff role so whoever registered it cannot keep signing in."
)
_users: list[dict[str, Any]] | None = None
_users_lock = RLock()


def normalize_email(value: str) -> str:
    return CONTROL_CHARACTERS.sub("", value).strip().lower()


def _normalize_name(value: str) -> str:
    return " ".join(CONTROL_CHARACTERS.sub(" ", value).split())


class LoginRequest(BaseModel):
    email: str = Field(min_length=5, max_length=255)
    password: str = Field(min_length=1, max_length=128)

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        normalized = normalize_email(value)
        if not EMAIL_PATTERN.fullmatch(normalized):
            raise ValueError("Enter a valid email address")
        return normalized


class RegisterRequest(LoginRequest):
    full_name: str = Field(min_length=2, max_length=FULL_NAME_MAX_LENGTH)
    # Law 81/2018 requires informing residents before collecting their data; the
    # accepted notice version is recorded in the registration audit event.
    accept_privacy_policy: bool

    @field_validator("accept_privacy_policy")
    @classmethod
    def require_privacy_consent(cls, value: bool) -> bool:
        if not value:
            raise ValueError("You must accept the privacy policy to create an account")
        return value

    @field_validator("full_name")
    @classmethod
    def normalize_full_name(cls, value: str) -> str:
        normalized = _normalize_name(value)
        if len(normalized) < 2:
            raise ValueError("Full name must contain at least two visible characters")
        return normalized


def _require_strong_password(password: str, email: str | None = None) -> None:
    try:
        validate_password_strength(password, email=email)
    except PasswordPolicyError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


def _load_seed() -> dict[str, Any]:
    return load_seed()


def _seed_users() -> list[dict[str, Any]]:
    """Demo identities are only available when explicitly enabled outside production."""
    if not settings.allow_demo_users:
        return []
    return [
        {
            **dict(user),
            "token_version": int(user.get("token_version", 0)),
            "tenant_key": str(user.get("tenant_key", "citymind-tripoli")),
            "email_verified": True,
        }
        for user in _load_seed()["users"]
    ]


def user_store() -> list[dict[str, Any]]:
    global _users
    with _users_lock:
        if _users is None:
            _users = _seed_users()
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
        "email_verified": user.email_verified_at is not None,
    }


def _find_user(db: Session, email: str) -> dict[str, Any] | None:
    normalized_email = normalize_email(email)
    if settings.operational_persistence_backend == "database":
        user = db.scalar(select(User).where(User.email == normalized_email))
        return _database_user_to_dict(user) if user else None
    with _users_lock:
        stored = next((item for item in user_store() if item["email"].lower() == normalized_email), None)
        return dict(stored) if stored else None


def _upgrade_password_hash(db: Session, email: str, password: str) -> None:
    """Re-hash a legacy low-iteration password after a successful login."""
    upgraded = hash_password(password)
    if settings.operational_persistence_backend == "database":
        stored = db.scalar(select(User).where(User.email == email))
        if stored is not None:
            stored.password_hash = upgraded
        return
    with _users_lock:
        record = next((item for item in user_store() if item["email"].lower() == email), None)
        if record is not None:
            record["password_hash"] = upgraded


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

    normalized_email = normalize_email(email)
    if not EMAIL_PATTERN.fullmatch(normalized_email):
        raise HTTPException(status_code=422, detail="Enter a valid email address")
    if password:
        _require_strong_password(password, normalized_email)

    if settings.operational_persistence_backend == "database":
        existing = db.scalar(select(User).where(User.email == normalized_email))
        if existing is None:
            if not password:
                raise HTTPException(status_code=422, detail="A password is required when creating a user")
            existing = User(
                full_name=_normalize_name(full_name) or normalized_email,
                email=normalized_email,
                password_hash=hash_password(password),
                role=role,
                is_active=is_active,
                # The owner vouches for addresses they create accounts for.
                email_verified_at=datetime.now(UTC),
            )
            db.add(existing)
        else:
            if existing.role == "citizen" and role != "citizen" and not password:
                raise HTTPException(status_code=409, detail=PRE_HIJACK_DETAIL)
            security_changed = existing.role != role or existing.is_active != is_active or password is not None
            existing.full_name = _normalize_name(full_name) or existing.full_name
            existing.role = role
            existing.is_active = is_active
            if password:
                existing.password_hash = hash_password(password)
            if security_changed:
                existing.token_version += 1
            if role != "citizen" and existing.email_verified_at is None:
                existing.email_verified_at = datetime.now(UTC)
        # Flush, not commit: the caller commits together with its audit event so a
        # change is never persisted without its audit record.
        try:
            db.flush()
        except IntegrityError as exc:
            db.rollback()
            raise HTTPException(status_code=409, detail="This email was just created by another request") from exc
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
    normalized_email = normalize_email(email)
    if not EMAIL_PATTERN.fullmatch(normalized_email):
        raise HTTPException(status_code=422, detail="Enter a valid email address")
    if password:
        _require_strong_password(password, normalized_email)

    with _users_lock:
        users = user_store()
        existing = next((item for item in users if item["email"].lower() == normalized_email), None)
        if existing is None:
            if not password:
                raise HTTPException(status_code=422, detail="A password is required when creating a user")
            existing = {
                "full_name": _normalize_name(full_name) or normalized_email,
                "email": normalized_email,
                "role": role,
                "is_active": is_active,
                "password_hash": hash_password(password),
                "token_version": 0,
                "tenant_key": "citymind-tripoli",
                "email_verified": True,
            }
            users.append(existing)
        else:
            if existing["role"] == "citizen" and role != "citizen" and not password:
                raise HTTPException(status_code=409, detail=PRE_HIJACK_DETAIL)
            security_changed = existing["role"] != role or existing["is_active"] != is_active or password is not None
            existing["full_name"] = _normalize_name(full_name) or existing["full_name"]
            existing["role"] = role
            existing["is_active"] = is_active
            if password:
                existing["password_hash"] = hash_password(password)
            if security_changed:
                existing["token_version"] = int(existing.get("token_version", 0)) + 1
            if role != "citizen":
                existing["email_verified"] = True
        return _public_user(existing)


def create_citizen_user(
    db: Session, email: str, full_name: str, password: str, *, verified: bool = True
) -> dict[str, Any]:
    normalized_email = normalize_email(email)
    normalized_name = _normalize_name(full_name)
    if settings.operational_persistence_backend == "database":
        if db.scalar(select(User.id).where(User.email == normalized_email)) is not None:
            raise HTTPException(status_code=409, detail="Email is already registered")
        user = User(
            full_name=normalized_name or normalized_email,
            email=normalized_email,
            password_hash=hash_password(password),
            role="citizen",
            is_active=True,
            email_verified_at=datetime.now(UTC) if verified else None,
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
            "full_name": normalized_name or normalized_email,
            "email": normalized_email,
            "role": "citizen",
            "is_active": True,
            "password_hash": hash_password(password),
            "token_version": 0,
            "tenant_key": "citymind-tripoli",
            "email_verified": verified,
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
    session_started_at: int | None = None,
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
        # Original sign-in time; carried unchanged through sliding refreshes.
        "sat": session_started_at or issued_timestamp,
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
        session_started_at = int(payload.get("sat", issued_at))
    except (KeyError, TypeError, ValueError) as exc:
        raise HTTPException(status_code=401, detail="Invalid access token") from exc
    if payload.get("iss") != settings.auth_token_issuer or claims["role"] not in ROLES:
        raise HTTPException(status_code=401, detail="Invalid access token")
    if issued_at > current_timestamp + 30 or expires_at <= current_timestamp:
        raise HTTPException(status_code=401, detail="Expired or invalid access token")
    claims["expires_at"] = expires_at
    claims["session_started_at"] = session_started_at
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


def _auth_response(user: dict[str, Any], response: Response, *, include_token: bool) -> dict[str, Any]:
    csrf_token = secrets.token_urlsafe(24)
    access_token = _encode_access_token(user, csrf_token=csrf_token)
    _set_auth_cookie(response, access_token)
    payload: dict[str, Any] = {
        "csrf_token": csrf_token,
        "token_type": "bearer",
        "expires_in": settings.auth_token_ttl_seconds,
        "user": _public_user(user),
        "production_ready": settings.is_production and settings.operational_persistence_backend == "database",
    }
    # Browsers authenticate with the HttpOnly cookie. The raw bearer token is only
    # handed out when a non-browser client explicitly asks for it, so script
    # injection in the web app cannot exfiltrate a portable credential.
    if include_token:
        payload["access_token"] = access_token
    return payload


@router.post("/login")
def login(
    payload: LoginRequest,
    request: Request,
    response: Response,
    include_token: bool = Query(default=False),
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
        # Shared across all addresses: a botnet or rotating IPv6 addresses must not
        # multiply the guesses allowed against one account.
        per_client=False,
    )
    user = _find_user(db, payload.email)
    supplied_hash = user.get("password_hash") if user else dummy_password_hash()
    password_is_valid = verify_password(payload.password, supplied_hash)
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
    if settings.requires_email_verification and not user.get("email_verified", True):
        # Only reached with the correct password, so it reveals nothing new.
        raise HTTPException(status_code=403, detail=EMAIL_NOT_VERIFIED_DETAIL)
    if needs_rehash(supplied_hash):
        _upgrade_password_hash(db, user["email"], payload.password)
    clear_rate_limit(request, db, scope="auth.login.account", identity=payload.email, per_client=False)
    record_audit_event(
        db,
        request,
        action="auth.login_succeeded",
        resource_type="user",
        actor_email=user["email"],
        resource_id=user["email"],
    )
    db.commit()
    return _auth_response(user, response, include_token=include_token)


@router.post("/register", status_code=201)
def register(
    payload: RegisterRequest,
    request: Request,
    response: Response,
    background_tasks: BackgroundTasks,
    include_token: bool = Query(default=False),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    enforce_rate_limit(
        request,
        db,
        scope="auth.register.ip",
        identity=None,
        limit=settings.login_ip_max_attempts,
        window_seconds=settings.public_query_window_seconds,
    )
    enforce_rate_limit(
        request,
        db,
        scope="auth.register",
        identity=payload.email,
        limit=settings.register_max_attempts,
        window_seconds=settings.public_query_window_seconds,
        per_client=False,
    )
    _require_strong_password(payload.password, payload.email)
    consent = {"privacy_policy_version": settings.privacy_policy_version}

    if settings.requires_email_verification:
        # Same response whether or not the address is taken, so registration cannot
        # be used to discover who has an account. The owner of an existing account
        # gets a heads-up email instead of a second account.
        response.status_code = 202
        accepted = {"verification_required": True, "email": payload.email}
        existing = _find_user(db, payload.email)
        if existing is not None:
            hash_password(payload.password)  # equalise timing with the create branch
            background_tasks.add_task(send_email, already_registered_email(existing["email"]))
            return accepted
        try:
            user = create_citizen_user(db, payload.email, payload.full_name, payload.password, verified=False)
        except (IntegrityError, HTTPException):
            db.rollback()
            return accepted
        record_audit_event(
            db,
            request,
            action="auth.registered",
            resource_type="user",
            actor_email=user["email"],
            resource_id=user["email"],
            details={**consent, "email_verified": False},
        )
        db.commit()
        background_tasks.add_task(send_email, verification_email(user["email"], user["full_name"], _verification_token(user)))
        return accepted

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
        details=consent,
    )
    db.commit()
    return _auth_response(user, response, include_token=include_token)


# --- email verification and password recovery ---------------------------------------


class EmailRequest(BaseModel):
    email: str = Field(min_length=5, max_length=255)

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        normalized = normalize_email(value)
        if not EMAIL_PATTERN.fullmatch(normalized):
            raise ValueError("Enter a valid email address")
        return normalized


class TokenRequest(BaseModel):
    token: str = Field(min_length=20, max_length=1024)


class PasswordResetRequest(TokenRequest):
    password: str = Field(min_length=1, max_length=128)


ACCEPTED = {"status": "accepted"}
INVALID_LINK_DETAIL = "This link is invalid or has expired. Request a new one."


def _verification_token(user: dict[str, Any]) -> str:
    return create_action_token(
        "verify_email",
        user["email"],
        binding=binding_for("verify", user["email"]),
        ttl_seconds=settings.email_verification_ttl_seconds,
    )


def _reset_binding(user: dict[str, Any]) -> str:
    # Changes whenever the password or the session version changes, which makes a
    # reset link single-use and voids it after any other password change.
    return binding_for(user.get("password_hash") or "", int(user.get("token_version", 0)))


def _limit_account_email(request: Request, db: Session, email: str, scope: str) -> None:
    enforce_rate_limit(
        request,
        db,
        scope=f"{scope}.ip",
        limit=settings.login_ip_max_attempts,
        window_seconds=settings.account_email_window_seconds,
    )
    enforce_rate_limit(
        request,
        db,
        scope=scope,
        identity=email,
        limit=settings.account_email_max_attempts,
        window_seconds=settings.account_email_window_seconds,
        per_client=False,
    )


def _apply_account_change(db: Session, email: str, *, password: str | None = None) -> dict[str, Any] | None:
    """Mark the address verified and optionally set a new password (revoking sessions)."""
    now = datetime.now(UTC)
    if settings.operational_persistence_backend == "database":
        stored = db.scalar(select(User).where(User.email == email).with_for_update())
        if stored is None:
            return None
        if stored.email_verified_at is None:
            stored.email_verified_at = now
        if password is not None:
            stored.password_hash = hash_password(password)
            stored.token_version += 1
        db.flush()
        return _database_user_to_dict(stored)
    with _users_lock:
        record = next((item for item in user_store() if item["email"].lower() == email), None)
        if record is None:
            return None
        record["email_verified"] = True
        if password is not None:
            record["password_hash"] = hash_password(password)
            record["token_version"] = int(record.get("token_version", 0)) + 1
        return dict(record)


@router.post("/verify-email")
def verify_email(payload: TokenRequest, request: Request, db: Session = Depends(get_db)) -> dict[str, Any]:
    enforce_rate_limit(
        request,
        db,
        scope="auth.verify_email.ip",
        limit=settings.login_ip_max_attempts,
        window_seconds=settings.login_window_seconds,
    )
    try:
        claims = read_action_token(payload.token, "verify_email")
    except ActionTokenError as exc:
        raise HTTPException(status_code=400, detail=INVALID_LINK_DETAIL) from exc
    user = _find_user(db, claims["email"])
    if user is None or not user["is_active"] or claims["binding"] != binding_for("verify", user["email"]):
        raise HTTPException(status_code=400, detail=INVALID_LINK_DETAIL)
    already_verified = bool(user.get("email_verified"))
    _apply_account_change(db, user["email"])
    if not already_verified:
        record_audit_event(
            db, request, action="auth.email_verified", resource_type="user",
            actor_email=user["email"], resource_id=user["email"],
        )
    db.commit()
    return {"verified": True, "email": user["email"]}


@router.post("/verify-email/resend", status_code=202)
def resend_verification(
    payload: EmailRequest,
    request: Request,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
) -> dict[str, str]:
    _limit_account_email(request, db, payload.email, "auth.verify_email.resend")
    user = _find_user(db, payload.email)
    if user is not None and user["is_active"] and not user.get("email_verified", True):
        background_tasks.add_task(send_email, verification_email(user["email"], user["full_name"], _verification_token(user)))
    return ACCEPTED


@router.post("/password/forgot", status_code=202)
def forgot_password(
    payload: EmailRequest,
    request: Request,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
) -> dict[str, str]:
    """Always 202, whether or not the address has an account."""
    _limit_account_email(request, db, payload.email, "auth.password_forgot")
    user = _find_user(db, payload.email)
    if user is not None and user["is_active"]:
        token = create_action_token(
            "reset_password",
            user["email"],
            binding=_reset_binding(user),
            ttl_seconds=settings.password_reset_ttl_seconds,
        )
        background_tasks.add_task(send_email, password_reset_email(user["email"], user["full_name"], token))
        record_audit_event(
            db, request, action="auth.password_reset_requested", resource_type="user",
            actor_email=user["email"], resource_id=user["email"],
        )
        db.commit()
    return ACCEPTED


@router.post("/password/reset")
def reset_password(
    payload: PasswordResetRequest,
    request: Request,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    enforce_rate_limit(
        request,
        db,
        scope="auth.password_reset.ip",
        limit=settings.login_ip_max_attempts,
        window_seconds=settings.login_window_seconds,
    )
    try:
        claims = read_action_token(payload.token, "reset_password")
    except ActionTokenError as exc:
        raise HTTPException(status_code=400, detail=INVALID_LINK_DETAIL) from exc
    user = _find_user(db, claims["email"])
    if user is None or not user["is_active"] or claims["binding"] != _reset_binding(user):
        raise HTTPException(status_code=400, detail=INVALID_LINK_DETAIL)
    _require_strong_password(payload.password, user["email"])

    updated = _apply_account_change(db, user["email"], password=payload.password)
    if updated is None:
        raise HTTPException(status_code=400, detail=INVALID_LINK_DETAIL)
    record_audit_event(
        db, request, action="auth.password_reset", resource_type="user",
        actor_email=user["email"], resource_id=user["email"],
    )
    db.commit()
    # A successful reset also lifts any lockout from earlier failed sign-ins.
    clear_rate_limit(request, db, scope="auth.login.account", identity=user["email"], per_client=False)
    background_tasks.add_task(send_email, password_changed_email(user["email"], user["full_name"]))
    return {"reset": True, "email": user["email"]}


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
        # Compare bytes: compare_digest raises TypeError on non-ASCII str input.
        if not csrf_token or not hmac.compare_digest(csrf_token.encode("utf-8"), claims["csrf"].encode("utf-8")):
            raise HTTPException(status_code=403, detail="CSRF token is missing or invalid")
    claims["authenticated_with"] = "bearer" if bearer_token else "cookie"
    return claims


@router.get("/me")
def me(
    request: Request,
    response: Response,
    user: dict[str, Any] = Depends(current_user),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    stored_user = _find_user(db, user["email"])
    if stored_user is None:
        raise HTTPException(status_code=401, detail="User is unavailable")

    expires_in = max(0, int(user.get("expires_at", 0)) - int(datetime.now(UTC).timestamp()))
    # Slide the cookie session forward while the operator is actively working so a
    # municipal shift is not interrupted by a hard expiry mid-task.
    # The slide stops once the session reaches its absolute maximum age, so a stolen
    # cookie cannot be kept alive indefinitely.
    now_timestamp = int(datetime.now(UTC).timestamp())
    session_started_at = int(user.get("session_started_at", now_timestamp))
    session_age = now_timestamp - session_started_at
    if (
        user.get("authenticated_with") == "cookie"
        and expires_in <= settings.auth_token_refresh_threshold_seconds
        and session_age + settings.auth_token_ttl_seconds <= settings.auth_session_max_age_seconds
    ):
        refreshed = _encode_access_token(
            stored_user,
            csrf_token=user["csrf"],
            session_started_at=session_started_at,
        )
        _set_auth_cookie(response, refreshed)
        expires_in = settings.auth_token_ttl_seconds

    return {**_public_user(stored_user), "expires_in": expires_in}


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

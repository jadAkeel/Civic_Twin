from __future__ import annotations

import base64
import hashlib
import hmac
import json
from typing import Any

from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel, Field

from app.core.seed import load_seed

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
_users: list[dict[str, Any]] | None = None


class LoginRequest(BaseModel):
    email: str = Field(min_length=5, max_length=255)
    password: str = Field(min_length=6, max_length=128)


class RegisterRequest(LoginRequest):
    full_name: str = Field(min_length=2, max_length=255)


def _load_seed() -> dict[str, Any]:
    return load_seed()


def user_store() -> list[dict[str, Any]]:
    global _users
    if _users is None:
        _users = [dict(user) for user in _load_seed()["users"]]
    return _users


def reset_user_store_for_tests() -> None:
    global _users
    _users = None


def list_local_users() -> list[dict[str, Any]]:
    return [_public_user(user) for user in user_store()]


def upsert_local_user(email: str, full_name: str, role: str, is_active: bool = True, password: str | None = None) -> dict[str, Any]:
    if role not in ROLES:
        raise HTTPException(status_code=422, detail="Unsupported CityMind role")

    normalized_email = email.strip().lower()
    password_hash = _hash_password(password or "citymind-demo", normalized_email)
    users = user_store()
    existing = next((item for item in users if item["email"].lower() == normalized_email), None)
    if existing is None:
        existing = {
            "full_name": full_name.strip() or normalized_email,
            "email": normalized_email,
            "role": role,
            "is_active": is_active,
            "password_hash": password_hash,
        }
        users.append(existing)
    else:
        existing["full_name"] = full_name.strip() or existing["full_name"]
        existing["role"] = role
        existing["is_active"] = is_active
        if password:
            existing["password_hash"] = password_hash
    return _public_user(existing)


def create_citizen_user(email: str, full_name: str, password: str) -> dict[str, Any]:
    normalized_email = email.strip().lower()
    users = user_store()
    existing = next((item for item in users if item["email"].lower() == normalized_email), None)
    if existing is not None:
        raise HTTPException(status_code=409, detail="Email is already registered")

    user = {
        "full_name": full_name.strip() or normalized_email,
        "email": normalized_email,
        "role": "citizen",
        "is_active": True,
        "password_hash": _hash_password(password, normalized_email),
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


def _hash_password(password: str, salt: str) -> str:
    iterations = 120_000
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), iterations)
    return f"pbkdf2_sha256${iterations}${salt}${base64.b64encode(digest).decode()}"


def _verify_password(password: str, password_hash: str | None, email: str) -> bool:
    if not password_hash:
        return False

    try:
        algorithm, iterations, salt, expected = password_hash.split("$", 3)
    except ValueError:
        return False

    if algorithm != "pbkdf2_sha256":
        return False

    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), int(iterations))
    actual = base64.b64encode(digest).decode()
    return hmac.compare_digest(actual, expected)


def _encode_local_token(user: dict[str, Any]) -> str:
    payload = base64.urlsafe_b64encode(json.dumps({"email": user["email"], "role": user["role"]}).encode()).decode()
    return f"local-placeholder.{payload}"


def _decode_local_token(token: str) -> dict[str, str]:
    if not token.startswith("local-placeholder."):
        raise HTTPException(status_code=401, detail="Only local placeholder tokens are supported")
    try:
        payload = token.split(".", 1)[1]
        decoded = json.loads(base64.urlsafe_b64decode(payload.encode()).decode())
    except Exception as exc:  # pragma: no cover - defensive against malformed local tokens
        raise HTTPException(status_code=401, detail="Invalid local placeholder token") from exc
    if decoded.get("role") not in ROLES:
        raise HTTPException(status_code=401, detail="Invalid role")
    return {"email": str(decoded["email"]), "role": str(decoded["role"])}


@router.post("/login")
def login(payload: LoginRequest) -> dict[str, Any]:
    normalized_email = payload.email.strip().lower()
    user = next((item for item in user_store() if item["email"].lower() == normalized_email and item["is_active"]), None)
    if user is None or not _verify_password(payload.password, user.get("password_hash"), normalized_email):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    return {
        "access_token": _encode_local_token(user),
        "token_type": "local-placeholder",
        "user": _public_user(user),
        "production_ready": False,
    }


@router.post("/register", status_code=201)
def register(payload: RegisterRequest) -> dict[str, Any]:
    user = create_citizen_user(payload.email, payload.full_name, payload.password)
    return {
        "access_token": _encode_local_token(user),
        "token_type": "local-placeholder",
        "user": _public_user(user),
        "production_ready": False,
    }


def current_user(authorization: str | None = Header(default=None)) -> dict[str, str]:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Missing local placeholder bearer token")
    return _decode_local_token(authorization.split(" ", 1)[1])


def require_roles(*roles: str):
    def dependency(user: dict[str, str] = Depends(current_user)) -> dict[str, str]:
        if user["role"] not in roles:
            raise HTTPException(status_code=403, detail="Insufficient CityMind role")
        return user

    return dependency

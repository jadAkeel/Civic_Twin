from __future__ import annotations

import base64
import json
from pathlib import Path
from typing import Any

from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel, Field

router = APIRouter(prefix="/auth", tags=["auth"])
SEED_PATH = Path(__file__).resolve().parents[5] / "data" / "tripoli_seed.json"
ROLES = {"citizen", "municipality_admin", "decision_maker", "analyst"}


class LoginRequest(BaseModel):
    email: str = Field(min_length=5, max_length=255)


def _load_seed() -> dict[str, Any]:
    return json.loads(SEED_PATH.read_text(encoding="utf-8"))


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
    users = _load_seed()["users"]
    user = next((item for item in users if item["email"] == payload.email and item["is_active"]), None)
    if user is None:
        raise HTTPException(status_code=401, detail="Unknown or inactive local demo user")
    return {
        "access_token": _encode_local_token(user),
        "token_type": "local-placeholder",
        "user": user,
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

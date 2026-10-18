"""Signed, expiring, single-purpose tokens for email verification and password reset.

Tokens are stateless (no table): an HMAC over the purpose, the account email, an
expiry and a *binding*. For password reset the binding is a fingerprint of the
current password hash and token version, so a token stops working the moment the
password changes: it is single-use without any server-side bookkeeping. Each
purpose uses its own derived key, so a verification token can never be replayed as
a reset token.
"""

from __future__ import annotations

import base64
import binascii
import hashlib
import hmac
import json
import time
from typing import Literal

from app.core.config import settings


Purpose = Literal["verify_email", "reset_password"]
MAX_TOKEN_LENGTH = 1024


class ActionTokenError(ValueError):
    """The token is malformed, forged, expired or for another purpose."""


def _key(purpose: Purpose) -> bytes:
    return hmac.new(
        settings.auth_token_secret.get_secret_value().encode(),
        f"citymind-action-token:{purpose}".encode(),
        hashlib.sha256,
    ).digest()


def _b64encode(value: bytes) -> str:
    return base64.urlsafe_b64encode(value).rstrip(b"=").decode("ascii")


def _b64decode(value: str) -> bytes:
    return base64.urlsafe_b64decode(f"{value}{'=' * (-len(value) % 4)}".encode("ascii"))


def binding_for(*parts: object) -> str:
    """Short fingerprint of account state the token must still match when used."""
    return hashlib.sha256("|".join(str(part) for part in parts).encode()).hexdigest()[:32]


def create_action_token(purpose: Purpose, email: str, *, binding: str, ttl_seconds: int) -> str:
    payload = {"p": purpose, "sub": email, "b": binding, "exp": int(time.time()) + ttl_seconds}
    body = _b64encode(json.dumps(payload, separators=(",", ":"), sort_keys=True).encode())
    signature = _b64encode(hmac.new(_key(purpose), body.encode("ascii"), hashlib.sha256).digest())
    return f"{body}.{signature}"


def read_action_token(token: str, purpose: Purpose) -> dict[str, str]:
    """Return {"email", "binding"} for a valid token or raise ActionTokenError."""
    if not token or len(token) > MAX_TOKEN_LENGTH:
        raise ActionTokenError("invalid token")
    try:
        body, signature = token.split(".")
        expected = hmac.new(_key(purpose), body.encode("ascii"), hashlib.sha256).digest()
        if not hmac.compare_digest(_b64decode(signature), expected):
            raise ActionTokenError("invalid token")
        payload = json.loads(_b64decode(body))
        if payload.get("p") != purpose:
            raise ActionTokenError("invalid token")
        if int(payload["exp"]) < int(time.time()):
            raise ActionTokenError("expired token")
        return {"email": str(payload["sub"]), "binding": str(payload["b"])}
    except ActionTokenError:
        raise
    except (ValueError, KeyError, TypeError, UnicodeError, binascii.Error) as exc:
        raise ActionTokenError("invalid token") from exc

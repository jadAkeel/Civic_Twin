"""Password hashing and password-strength policy shared by the API and the seed bootstrap."""

from __future__ import annotations

import base64
import hashlib
import hmac
import re
import secrets
import unicodedata
from functools import lru_cache

# Module import (not `from ... import settings`) so config.py can call the password
# policy while it is still validating its own Settings instance.
from app.core import config as _config


PBKDF2_ALGORITHM = "pbkdf2_sha256"
MIN_ITERATIONS = 120_000
MAX_ITERATIONS = 1_000_000

# Passwords that are trivially guessed. Demo passwords are listed because they are
# published in the repository README and must never protect a real account.
WEAK_PASSWORDS = frozenset(
    {
        "password",
        "password1",
        "password123",
        "passw0rd",
        "12345678",
        "123456789",
        "1234567890",
        "qwertyuiop",
        "administrator",
        "citymind",
        "citymind123",
        "tripoli123",
        "owner-demo",
        "admin-demo",
        "citizen-demo",
        "analyst-demo",
        "agency-demo",
        "changeme",
        "letmein",
        "welcome1",
        "iloveyou",
    }
)
_SEQUENTIAL_RUN = re.compile(r"(?:abcdefg|0123456|1234567|7654321|qwertyu)", re.IGNORECASE)


class PasswordPolicyError(ValueError):
    """Raised when a supplied password does not meet the CityMind policy."""


def normalize_password(password: str) -> str:
    """NFKC keeps visually identical Unicode passwords from hashing differently."""
    return unicodedata.normalize("NFKC", password)


def validate_password_strength(password: str, *, email: str | None = None, min_length: int | None = None) -> None:
    candidate = normalize_password(password)
    minimum = min_length or _config.settings.password_min_length

    if len(candidate) < minimum:
        raise PasswordPolicyError(f"Password must be at least {minimum} characters")
    if len(candidate) > 128:
        raise PasswordPolicyError("Password must be at most 128 characters")
    if candidate.strip() != candidate:
        raise PasswordPolicyError("Password must not start or end with whitespace")

    lowered = candidate.lower()
    if lowered in WEAK_PASSWORDS:
        raise PasswordPolicyError("Password is too common. Choose a unique passphrase")
    if _SEQUENTIAL_RUN.search(lowered):
        raise PasswordPolicyError("Password must not contain a keyboard or digit sequence")
    if len(set(candidate)) < 5:
        raise PasswordPolicyError("Password must not repeat the same few characters")

    if email:
        local_part = email.split("@", 1)[0].lower()
        if local_part and len(local_part) >= 3 and local_part in lowered:
            raise PasswordPolicyError("Password must not contain your email address")

    # Arabic has no upper/lower case, so "letters in an uncased script" is its own
    # class. Without it an Arabic passphrase could never reach three classes and
    # Arabic-speaking residents would be forced to use Latin letters.
    classes = sum(
        (
            any(character.islower() for character in candidate),
            any(character.isupper() for character in candidate),
            any(character.isalpha() and not (character.islower() or character.isupper()) for character in candidate),
            any(character.isdigit() for character in candidate),
            any(not character.isalnum() for character in candidate),
        )
    )
    if classes < 3:
        raise PasswordPolicyError(
            "Password must combine at least three of: lowercase, uppercase, Arabic letters, digits, symbols"
        )


def hash_password(password: str, salt: str | None = None, iterations: int | None = None) -> str:
    password_salt = salt or secrets.token_urlsafe(16)
    rounds = iterations or _config.settings.password_hash_iterations
    digest = hashlib.pbkdf2_hmac(
        "sha256", normalize_password(password).encode("utf-8"), password_salt.encode("utf-8"), rounds
    )
    return f"{PBKDF2_ALGORITHM}${rounds}${password_salt}${base64.b64encode(digest).decode()}"


def verify_password(password: str, password_hash: str | None) -> bool:
    if not password_hash:
        return False
    try:
        algorithm, iterations_text, salt, expected = password_hash.split("$", 3)
        iterations = int(iterations_text)
    except (TypeError, ValueError):
        return False
    if algorithm != PBKDF2_ALGORITHM or iterations < MIN_ITERATIONS or iterations > MAX_ITERATIONS:
        return False
    digest = hashlib.pbkdf2_hmac(
        "sha256", normalize_password(password).encode("utf-8"), salt.encode("utf-8"), iterations
    )
    return hmac.compare_digest(base64.b64encode(digest).decode(), expected)


def needs_rehash(password_hash: str | None) -> bool:
    """True when a stored hash uses fewer rounds than the current policy."""
    if not password_hash:
        return False
    try:
        algorithm, iterations_text, _, _ = password_hash.split("$", 3)
        return algorithm != PBKDF2_ALGORITHM or int(iterations_text) < _config.settings.password_hash_iterations
    except (TypeError, ValueError):
        return True


@lru_cache(maxsize=1)
def dummy_password_hash() -> str:
    """Compared against when the account does not exist so that login timing does not
    reveal whether an email is registered. Built lazily so importing this module never
    needs the settings object (config.py imports it while still validating)."""
    return hash_password("invalid-password", salt="citymind-constant-time-dummy")

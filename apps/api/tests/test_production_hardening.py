import importlib
from datetime import UTC, datetime, timedelta

import pytest
from fastapi.testclient import TestClient

from app.core import security
from app.core.config import settings
from app.core.security import PasswordPolicyError, hash_password, needs_rehash, validate_password_strength, verify_password
from app.main import app
from app.modules.auth.router import _encode_access_token, reset_user_store_for_tests
from app.seed import load_seed as seed_module

# The package re-exports the APIRouter as `router`, so load the module explicitly.
auth_router = importlib.import_module("app.modules.auth.router")


def _login(client: TestClient, email: str, password: str, **params: str):
    query = "&".join(f"{key}={value}" for key, value in params.items())
    return client.post(f"/auth/login{'?' + query if query else ''}", json={"email": email, "password": password})


# --- demo identities --------------------------------------------------------------


def test_demo_accounts_do_not_exist_unless_explicitly_enabled(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "allow_demo_users", False)
    reset_user_store_for_tests()
    client = TestClient(app)

    response = _login(client, "owner.demo@citymind.local", "owner-demo")

    assert response.status_code == 401


def test_seed_loader_refuses_demo_accounts_in_production(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "app_env", "production")

    with pytest.raises(ValueError, match="never be created in production"):
        seed_module.load_seed_data(object(), seed_module.load_seed_file(), include_demo_users=True)  # type: ignore[arg-type]


# --- token delivery ---------------------------------------------------------------


def test_browser_login_never_receives_the_raw_bearer_token() -> None:
    client = TestClient(app)

    response = _login(client, "citizen.demo@citymind.local", "citizen-demo")

    assert response.status_code == 200
    assert "access_token" not in response.json()
    assert response.json()["csrf_token"]
    assert settings.auth_cookie_name in response.cookies


def test_api_clients_can_explicitly_request_a_bearer_token() -> None:
    client = TestClient(app)

    response = _login(client, "citizen.demo@citymind.local", "citizen-demo", include_token="true")

    assert response.status_code == 200
    assert len(response.json()["access_token"].split(".")) == 3


def test_me_slides_a_cookie_session_that_is_close_to_expiry() -> None:
    client = TestClient(app)
    login = _login(client, "citizen.demo@citymind.local", "citizen-demo")
    assert login.status_code == 200
    user = auth_router._find_user(None, "citizen.demo@citymind.local")  # type: ignore[arg-type]
    assert user is not None
    nearly_expired = _encode_access_token(
        user,
        now=datetime.now(UTC) - timedelta(seconds=settings.auth_token_ttl_seconds - 60),
        csrf_token=login.json()["csrf_token"],
    )
    client.cookies.set(settings.auth_cookie_name, nearly_expired)

    response = client.get("/auth/me")

    assert response.status_code == 200
    assert response.json()["expires_in"] == settings.auth_token_ttl_seconds
    assert response.cookies.get(settings.auth_cookie_name)


# --- password policy --------------------------------------------------------------


@pytest.mark.parametrize(
    "password",
    [
        "short1!",
        "alllowercaseletters",
        "citizen-demo",
        "Password123",  # three classes, but on the common-password list
        "aaaaaaaaaaA1!",
        " Leading-space-9",
    ],
)
def test_weak_passwords_are_rejected(password: str) -> None:
    with pytest.raises(PasswordPolicyError):
        validate_password_strength(password)


def test_password_may_not_contain_the_email_local_part() -> None:
    with pytest.raises(PasswordPolicyError, match="email"):
        validate_password_strength("Operator-Tripoli-71", email="operator@example.com")


@pytest.mark.parametrize(
    "password",
    ["Trablous-Mun-2026!", "كلمة-سر-طرابلس-2026", "ميناء طرابلس ١٩٧٥", "Mina Harbour 1975"],
)
def test_strong_passwords_including_arabic_passphrases_are_accepted(password: str) -> None:
    validate_password_strength(password, email="someone@example.com")


def test_registration_enforces_the_password_policy() -> None:
    client = TestClient(app)

    weak = client.post(
        "/auth/register",
        json={"full_name": "Weak Password", "email": "weak@example.com", "password": "password123", "accept_privacy_policy": True},
    )

    assert weak.status_code == 422


def test_legacy_low_iteration_hashes_are_upgraded_on_login() -> None:
    legacy = hash_password("Trablous-Mun-2026!", iterations=120_000)
    assert needs_rehash(legacy)
    auth_router.user_store().append(
        {
            "full_name": "Legacy Account",
            "email": "legacy@example.com",
            "role": "citizen",
            "is_active": True,
            "password_hash": legacy,
            "token_version": 0,
            "tenant_key": "citymind-tripoli",
        }
    )
    client = TestClient(app)

    assert _login(client, "legacy@example.com", "Trablous-Mun-2026!").status_code == 200

    stored = auth_router._find_user(None, "legacy@example.com")  # type: ignore[arg-type]
    assert stored is not None
    assert not needs_rehash(stored["password_hash"])
    assert verify_password("Trablous-Mun-2026!", stored["password_hash"])


def test_unicode_passwords_are_normalised_before_hashing() -> None:
    composed = "Café-Tripoli-2026"
    decomposed = "Café-Tripoli-2026"

    assert verify_password(decomposed, security.hash_password(composed))


# --- owner lockout ----------------------------------------------------------------


def test_the_last_owner_cannot_demote_themselves() -> None:
    client = TestClient(app)
    login = _login(client, "owner.demo@citymind.local", "owner-demo", include_token="true")
    headers = {"Authorization": f"Bearer {login.json()['access_token']}"}

    response = client.post(
        "/admin/users",
        json={
            "full_name": "Demo Owner",
            "email": "owner.demo@citymind.local",
            "role": "analyst",
            "is_active": True,
        },
        headers=headers,
    )

    assert response.status_code == 409
    assert "only active owner" in response.json()["detail"]


# --- transport limits and error envelope ------------------------------------------


def test_oversized_request_bodies_are_rejected_before_parsing() -> None:
    client = TestClient(app)

    response = client.post(
        "/auth/login",
        content=b"{" + b" " * (settings.max_request_body_bytes + 1) + b"}",
        headers={"Content-Type": "application/json"},
    )

    assert response.status_code == 413


def test_errors_share_one_envelope_with_a_request_id() -> None:
    client = TestClient(app)

    response = client.get("/reports", headers={"X-Request-ID": "trace-12345678"})

    assert response.status_code == 401
    assert response.json() == {"detail": "Missing access token", "request_id": "trace-12345678"}
    assert response.headers["x-request-id"] == "trace-12345678"


def test_validation_errors_name_the_field_without_echoing_input() -> None:
    client = TestClient(app)

    response = client.post("/auth/login", json={"email": "not-an-email", "password": "secret-value"})

    assert response.status_code == 422
    body = response.json()
    assert body["errors"][0]["field"] == "email"
    assert "secret-value" not in response.text


def test_ready_reports_identity_mode_and_ai_key_status_without_secrets(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "ai_provider", "gemini")
    monkeypatch.setattr(settings, "gemini_api_key", None)
    client = TestClient(app)
    login = _login(client, "owner.demo@citymind.local", "owner-demo", include_token="true")
    token = login.json()["access_token"]

    payload = client.get("/ready/details", headers={"Authorization": f"Bearer {token}"}).json()

    assert payload["runtime_data_mode"] == "demo_seed_and_in_memory"
    assert payload["persistence"]["scenarios"] == "memory"
    assert payload["ai"]["provider"] == "gemini"
    assert payload["ai"]["status"] == "missing_api_key"
    assert "demo_accounts_enabled" in payload["identity"]


def test_arabic_only_letters_without_digits_or_symbols_are_still_rejected() -> None:
    with pytest.raises(PasswordPolicyError):
        validate_password_strength("كلمةسرطرابلسية")

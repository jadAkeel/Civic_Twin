"""Email verification, password recovery, privacy consent and client error reports."""

import importlib
import re

import pytest
from fastapi.testclient import TestClient

from app.core.action_tokens import ActionTokenError, binding_for, create_action_token, read_action_token
from app.core.config import settings
from app.core.email import OutgoingEmail
from app.main import app

auth_router = importlib.import_module("app.modules.auth.router")

PASSWORD = "Harbour-Lights-2026!"
NEW_PASSWORD = "Castle-Guard-Mina-88"


@pytest.fixture
def outbox(monkeypatch: pytest.MonkeyPatch) -> list[OutgoingEmail]:
    sent: list[OutgoingEmail] = []

    def capture(message: OutgoingEmail) -> bool:
        sent.append(message)
        return True

    monkeypatch.setattr(auth_router, "send_email", capture)
    return sent


@pytest.fixture
def verification_on(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "email_verification_required", True)


def _token(message: OutgoingEmail) -> str:
    match = re.search(r"#token=(\S+)", message.text)
    assert match, message.text
    return match.group(1)


def _register(client: TestClient, email: str, **extra: object):
    return client.post(
        "/auth/register",
        json={"full_name": "Rania Haddad", "email": email, "password": PASSWORD, "accept_privacy_policy": True, **extra},
    )


# --- privacy consent ----------------------------------------------------------------


def test_registration_requires_accepting_the_privacy_policy() -> None:
    response = TestClient(app).post(
        "/auth/register", json={"full_name": "Rania Haddad", "email": "rania@example.com", "password": PASSWORD}
    )
    assert response.status_code == 422
    assert response.json()["errors"][0]["field"] == "accept_privacy_policy"


# --- email verification -------------------------------------------------------------


def test_new_accounts_must_verify_their_email_before_signing_in(outbox, verification_on) -> None:
    client = TestClient(app)
    registered = _register(client, "rania@example.com")

    assert registered.status_code == 202
    assert registered.json() == {"verification_required": True, "email": "rania@example.com"}
    assert "set-cookie" not in registered.headers
    assert len(outbox) == 1 and "/verify-email#token=" in outbox[0].text

    blocked = client.post("/auth/login", json={"email": "rania@example.com", "password": PASSWORD})
    assert blocked.status_code == 403

    verified = client.post("/auth/verify-email", json={"token": _token(outbox[0])})
    assert verified.status_code == 200
    assert client.post("/auth/login", json={"email": "rania@example.com", "password": PASSWORD}).status_code == 200


def test_registration_does_not_reveal_existing_accounts(outbox, verification_on) -> None:
    client = TestClient(app)
    first = _register(client, "rania@example.com")
    again = _register(client, "rania@example.com")
    staff = _register(client, "citizen.demo@citymind.local")

    assert first.status_code == again.status_code == staff.status_code == 202
    assert again.json()["verification_required"] is True
    # The account holder is told someone tried, and no second account exists.
    assert "لديك حساب مسجّل مسبقًا" in outbox[-1].text
    assert sum(1 for user in auth_router.user_store() if user["email"] == "rania@example.com") == 1


def test_resend_verification_is_uniform_and_only_mails_unverified_accounts(outbox, verification_on) -> None:
    client = TestClient(app)
    _register(client, "rania@example.com")
    outbox.clear()

    unknown = client.post("/auth/verify-email/resend", json={"email": "nobody@example.com"})
    verified_user = client.post("/auth/verify-email/resend", json={"email": "citizen.demo@citymind.local"})
    pending = client.post("/auth/verify-email/resend", json={"email": "rania@example.com"})

    assert unknown.status_code == verified_user.status_code == pending.status_code == 202
    assert [message.to for message in outbox] == ["rania@example.com"]


def test_forged_or_cross_purpose_verification_tokens_are_rejected(verification_on) -> None:
    client = TestClient(app)
    reset_token = create_action_token(
        "reset_password", "citizen.demo@citymind.local", binding=binding_for("verify", "citizen.demo@citymind.local"),
        ttl_seconds=600,
    )
    assert client.post("/auth/verify-email", json={"token": reset_token}).status_code == 400
    assert client.post("/auth/verify-email", json={"token": "x" * 40 + ".abc"}).status_code == 400


def test_action_tokens_expire() -> None:
    token = create_action_token("verify_email", "a@b.lb", binding="x", ttl_seconds=-1)
    with pytest.raises(ActionTokenError):
        read_action_token(token, "verify_email")


# --- password recovery --------------------------------------------------------------


def test_forgot_password_always_accepts_and_only_mails_real_accounts(outbox) -> None:
    client = TestClient(app)
    unknown = client.post("/auth/password/forgot", json={"email": "nobody@example.com"})
    known = client.post("/auth/password/forgot", json={"email": "citizen.demo@citymind.local"})

    assert unknown.status_code == known.status_code == 202
    assert unknown.json() == known.json()
    assert [message.to for message in outbox] == ["citizen.demo@citymind.local"]
    assert "/reset-password#token=" in outbox[0].text


def test_password_reset_sets_the_password_revokes_sessions_and_is_single_use(outbox) -> None:
    client = TestClient(app)
    session = client.post("/auth/login", json={"email": "citizen.demo@citymind.local", "password": "citizen-demo"})
    old_cookie = session.cookies.get(settings.auth_cookie_name)
    client.post("/auth/password/forgot", json={"email": "citizen.demo@citymind.local"})
    token = _token(outbox[0])

    reset = client.post("/auth/password/reset", json={"token": token, "password": NEW_PASSWORD})
    assert reset.status_code == 200
    assert "تم تغيير كلمة مرور حسابك" in outbox[-1].text

    fresh = TestClient(app)
    assert fresh.post("/auth/login", json={"email": "citizen.demo@citymind.local", "password": "citizen-demo"}).status_code == 401
    assert fresh.post("/auth/login", json={"email": "citizen.demo@citymind.local", "password": NEW_PASSWORD}).status_code == 200
    # Every existing session is signed out.
    replay = TestClient(app)
    replay.cookies.set(settings.auth_cookie_name, old_cookie or "")
    assert replay.get("/auth/me").status_code == 401
    # The same link cannot be used twice.
    assert client.post("/auth/password/reset", json={"token": token, "password": "Another-Harbour-77"}).status_code == 400


def test_password_reset_enforces_the_password_policy(outbox) -> None:
    client = TestClient(app)
    client.post("/auth/password/forgot", json={"email": "citizen.demo@citymind.local"})
    weak = client.post("/auth/password/reset", json={"token": _token(outbox[0]), "password": "password123"})
    assert weak.status_code == 422


def test_password_reset_also_verifies_the_address(outbox, verification_on) -> None:
    client = TestClient(app)
    _register(client, "rania@example.com")
    client.post("/auth/password/forgot", json={"email": "rania@example.com"})
    reset_mail = next(message for message in outbox if "/reset-password#token=" in message.text)

    assert client.post("/auth/password/reset", json={"token": _token(reset_mail), "password": NEW_PASSWORD}).status_code == 200
    assert client.post("/auth/login", json={"email": "rania@example.com", "password": NEW_PASSWORD}).status_code == 200


def test_forgot_password_is_rate_limited_per_address(outbox) -> None:
    client = TestClient(app)
    statuses = [
        client.post("/auth/password/forgot", json={"email": "citizen.demo@citymind.local"}).status_code
        for _ in range(settings.account_email_max_attempts + 1)
    ]
    assert statuses[-1] == 429
    assert len(outbox) == settings.account_email_max_attempts


def test_email_links_use_the_url_fragment_so_tokens_stay_out_of_logs(outbox) -> None:
    TestClient(app).post("/auth/password/forgot", json={"email": "citizen.demo@citymind.local"})
    assert "?token=" not in outbox[0].text


# --- client error reports -----------------------------------------------------------


def test_web_client_errors_are_accepted_and_bounded() -> None:
    client = TestClient(app)
    ok = client.post("/telemetry/client-errors", json={"message": "TypeError: x is undefined", "path": "/map?token=secret"})
    too_long = client.post("/telemetry/client-errors", json={"message": "x" * 600})

    assert ok.status_code == 204
    assert too_long.status_code == 422

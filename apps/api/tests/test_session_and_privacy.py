from fastapi.testclient import TestClient

from app.main import app
from app.modules.assistant.router import reset_assistant_queries_for_tests
from app.modules.auth.router import reset_user_store_for_tests
from app.modules.reports.router import reset_report_store_for_tests


def test_cookie_session_requires_csrf_and_logout_revokes_bearer_token() -> None:
    reset_user_store_for_tests()
    reset_assistant_queries_for_tests()
    client = TestClient(app)
    login = client.post(
        "/auth/login?include_token=true",
        json={"email": "citizen.demo@citymind.local", "password": "citizen-demo"},
    )
    assert login.status_code == 200

    without_csrf = client.post(
        "/assistant/query",
        json={"question": "Which reports are unresolved?"},
    )
    assert without_csrf.status_code == 403

    csrf = login.json()["csrf_token"]
    authorized = client.post(
        "/assistant/query",
        headers={"X-CSRF-Token": csrf},
        json={"question": "Which reports are unresolved?"},
    )
    assert authorized.status_code == 201

    token = login.json()["access_token"]
    assert client.post("/auth/logout", headers={"X-CSRF-Token": csrf}).status_code == 204
    revoked = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert revoked.status_code == 401


def test_public_report_feed_redacts_details_and_precise_sensitive_locations() -> None:
    reset_report_store_for_tests()
    client = TestClient(app)

    response = client.get("/reports/public")

    assert response.status_code == 200
    reports = response.json()
    assert reports
    assert all("description" not in report and "manual_location" not in report for report in reports)
    sensitive = [
        report
        for report in reports
        if report["category"] in {"security_incident", "medical_emergency", "fire_hazard"}
    ]
    assert sensitive
    assert all(report["approximate_latitude"] is None for report in sensitive)


def test_citizen_cannot_read_internal_report_feed() -> None:
    reset_user_store_for_tests()
    client = TestClient(app)
    login = client.post(
        "/auth/login",
        json={"email": "citizen.demo@citymind.local", "password": "citizen-demo"},
    )
    assert login.status_code == 200
    assert client.get("/reports").status_code == 403
    assert client.get("/reports/mine").status_code == 200

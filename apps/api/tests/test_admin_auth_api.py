from datetime import UTC, datetime, timedelta

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

from app.main import app
from app.modules.admin.router import reset_admin_assets_for_tests
from app.modules.auth.router import _decode_access_token, _encode_access_token, reset_user_store_for_tests
from app.modules.reports.router import reset_report_store_for_tests


PASSWORDS = {
    "owner.demo@citymind.local": "owner-demo",
    "admin.demo@citymind.local": "admin-demo",
    "citizen.demo@citymind.local": "citizen-demo",
    "police.demo@citymind.local": "agency-demo",
    "redcross.demo@citymind.local": "agency-demo",
    "civildefense.demo@citymind.local": "agency-demo",
}


def _token(email: str = "admin.demo@citymind.local") -> str:
    client = TestClient(app)
    response = client.post(
        "/auth/login?include_token=true", json={"email": email, "password": PASSWORDS[email]}
    )
    assert response.status_code == 200
    return response.json()["access_token"]


def test_local_auth_login_returns_signed_bearer_token_without_persistence_claim() -> None:
    reset_user_store_for_tests()
    client = TestClient(app)

    response = client.post(
        "/auth/login?include_token=true",
        json={"email": "owner.demo@citymind.local", "password": "owner-demo"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["token_type"] == "bearer"
    assert payload["expires_in"] == 3600
    assert len(payload["access_token"].split(".")) == 3
    assert payload["production_ready"] is False
    assert payload["user"]["role"] == "owner"
    assert "password_hash" not in payload["user"]


def test_tampered_access_token_is_rejected() -> None:
    reset_user_store_for_tests()
    client = TestClient(app)
    token = _token("admin.demo@citymind.local")
    header, payload, signature = token.split(".")
    tampered_payload = f"{payload[:-1]}{'A' if payload[-1] != 'A' else 'B'}"

    response = client.get(
        "/admin/overview",
        headers={"Authorization": f"Bearer {header}.{tampered_payload}.{signature}"},
    )

    assert response.status_code == 401


def test_expired_access_token_is_rejected() -> None:
    issued_at = datetime(2026, 1, 1, tzinfo=UTC)
    token = _encode_access_token(
        {"email": "owner@example.com", "role": "owner"},
        now=issued_at,
    )

    with pytest.raises(HTTPException) as error:
        _decode_access_token(token, now=issued_at + timedelta(hours=2))

    assert error.value.status_code == 401


def test_local_auth_rejects_wrong_password() -> None:
    reset_user_store_for_tests()
    client = TestClient(app)

    response = client.post("/auth/login", json={"email": "owner.demo@citymind.local", "password": "wrong-password"})

    assert response.status_code == 401


def test_login_rate_limit_blocks_repeated_failed_attempts() -> None:
    reset_user_store_for_tests()
    client = TestClient(app)

    responses = [
        client.post(
            "/auth/login",
            json={"email": "owner.demo@citymind.local", "password": "wrong-password"},
        )
        for _ in range(6)
    ]

    assert [response.status_code for response in responses[:5]] == [401] * 5
    assert responses[5].status_code == 429
    assert 1 <= int(responses[5].headers["retry-after"]) <= 60


def test_auth_me_validates_token_and_returns_public_user() -> None:
    reset_user_store_for_tests()
    client = TestClient(app)
    token = _token("owner.demo@citymind.local")

    response = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})

    assert response.status_code == 200
    assert response.json()["email"] == "owner.demo@citymind.local"
    assert response.json()["role"] == "owner"
    assert "password_hash" not in response.json()


def test_register_creates_citizen_account_and_rejects_duplicate_email() -> None:
    reset_user_store_for_tests()
    client = TestClient(app)

    register_response = client.post(
        "/auth/register",
        json={"full_name": "New Citizen", "email": "new.citizen@example.com", "password": "Tripoli-Citizen-92", "accept_privacy_policy": True},
    )
    duplicate_response = client.post(
        "/auth/register",
        json={"full_name": "New Citizen", "email": "new.citizen@example.com", "password": "Tripoli-Citizen-92", "accept_privacy_policy": True},
    )
    login_response = client.post("/auth/login", json={"email": "new.citizen@example.com", "password": "Tripoli-Citizen-92"})

    assert register_response.status_code == 201
    assert register_response.json()["user"]["role"] == "citizen"
    assert "password_hash" not in register_response.json()["user"]
    assert duplicate_response.status_code == 409
    assert login_response.status_code == 200


def test_admin_overview_requires_admin_role() -> None:
    reset_user_store_for_tests()
    client = TestClient(app)
    citizen_token = _token("citizen.demo@citymind.local")

    response = client.get("/admin/overview", headers={"Authorization": f"Bearer {citizen_token}"})

    assert response.status_code == 403


def test_admin_overview_returns_operations_counts_for_admin() -> None:
    reset_user_store_for_tests()
    reset_report_store_for_tests()
    client = TestClient(app)
    token = _token()

    response = client.get("/admin/overview", headers={"Authorization": f"Bearer {token}"})

    assert response.status_code == 200
    overview = response.json()
    assert overview["portal_name"] == "بوابة البلدية"
    assert overview["visible_categories"] == ["all"]
    assert overview["notification_provider_status"] == "not_configured"
    assert overview["official_gis_status"] == "not_configured"
    assert overview["monthly_summary"]["source"] == "memory_snapshot"
    assert overview["hotspots"]
    assert overview["reports_total"] >= 20
    assert overview["assets_total"] >= 5
    assert overview["active_predictions"] > 0


def test_admin_can_update_report_and_asset_status() -> None:
    reset_user_store_for_tests()
    reset_report_store_for_tests()
    reset_admin_assets_for_tests()
    client = TestClient(app)
    token = _token()
    headers = {"Authorization": f"Bearer {token}"}

    report_response = client.patch("/admin/reports/TRP-1001/status", json={"status": "in_progress"}, headers=headers)
    asset_response = client.patch("/admin/assets/asset-1/status", json={"status": "needs_maintenance"}, headers=headers)

    assert report_response.status_code == 200
    assert report_response.json()["status"] == "in_progress"
    assert asset_response.status_code == 200
    assert asset_response.json()["status"] == "needs_maintenance"


def test_admin_status_updates_reject_unknown_values() -> None:
    reset_user_store_for_tests()
    reset_report_store_for_tests()
    reset_admin_assets_for_tests()
    client = TestClient(app)
    headers = {"Authorization": f"Bearer {_token()}"}

    report_response = client.patch("/admin/reports/TRP-1001/status", json={"status": "deleted"}, headers=headers)
    asset_response = client.patch("/admin/assets/asset-1/status", json={"status": "broken"}, headers=headers)

    assert report_response.status_code == 422
    assert asset_response.status_code == 422


def test_owner_can_create_user_with_role_and_new_user_can_login() -> None:
    reset_user_store_for_tests()
    client = TestClient(app)
    owner_token = _token("owner.demo@citymind.local")
    headers = {"Authorization": f"Bearer {owner_token}"}

    create_response = client.post(
        "/admin/users",
        json={
            "full_name": "Tripoli Operator",
            "email": "operator@example.com",
            "role": "municipality_admin",
            "password": "Trablous-Mun-2026!",
            "is_active": True,
        },
        headers=headers,
    )
    login_response = client.post("/auth/login", json={"email": "operator@example.com", "password": "Trablous-Mun-2026!"})

    assert create_response.status_code == 200
    assert create_response.json()["role"] == "municipality_admin"
    assert "password_hash" not in create_response.json()
    assert login_response.status_code == 200
    assert login_response.json()["user"]["role"] == "municipality_admin"


def test_non_owner_cannot_manage_user_roles() -> None:
    reset_user_store_for_tests()
    client = TestClient(app)
    admin_token = _token("admin.demo@citymind.local")

    response = client.post(
        "/admin/users",
        json={
            "full_name": "Blocked User",
            "email": "blocked@example.com",
            "role": "analyst",
            "is_active": True,
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )

    assert response.status_code == 403


def test_municipality_can_see_all_reports() -> None:
    reset_user_store_for_tests()
    reset_report_store_for_tests()
    client = TestClient(app)
    token = _token("admin.demo@citymind.local")

    response = client.get("/admin/reports", headers={"Authorization": f"Bearer {token}"})

    assert response.status_code == 200
    categories = {report["category"] for report in response.json()}
    assert {"waste", "traffic_congestion", "security_incident", "medical_emergency", "fire_hazard"}.issubset(categories)


def test_police_portal_only_sees_security_reports() -> None:
    reset_user_store_for_tests()
    reset_report_store_for_tests()
    client = TestClient(app)
    token = _token("police.demo@citymind.local")
    headers = {"Authorization": f"Bearer {token}"}

    reports_response = client.get("/admin/reports", headers=headers)
    hidden_detail_response = client.get("/admin/reports/TRP-1001", headers=headers)
    hidden_traffic_detail_response = client.get("/admin/reports/TRP-1002", headers=headers)
    hidden_status_response = client.patch("/admin/reports/TRP-1001/status", json={"status": "in_progress"}, headers=headers)

    assert reports_response.status_code == 200
    assert {report["category"] for report in reports_response.json()} == {"security_incident"}
    assert "waste" not in {report["category"] for report in reports_response.json()}
    assert "traffic_congestion" not in {report["category"] for report in reports_response.json()}
    assert hidden_detail_response.status_code == 403
    assert hidden_traffic_detail_response.status_code == 403
    assert hidden_status_response.status_code == 403


def test_red_cross_portal_cannot_see_unrelated_security_reports() -> None:
    reset_user_store_for_tests()
    reset_report_store_for_tests()
    client = TestClient(app)
    token = _token("redcross.demo@citymind.local")
    headers = {"Authorization": f"Bearer {token}"}

    reports_response = client.get("/admin/reports", headers=headers)
    hidden_detail_response = client.get("/admin/reports/TRP-1008", headers=headers)

    assert reports_response.status_code == 200
    assert {report["category"] for report in reports_response.json()} == {"medical_emergency"}
    assert hidden_detail_response.status_code == 403


def test_civil_defense_portal_cannot_see_unrelated_municipal_reports() -> None:
    reset_user_store_for_tests()
    reset_report_store_for_tests()
    client = TestClient(app)
    token = _token("civildefense.demo@citymind.local")
    headers = {"Authorization": f"Bearer {token}"}

    reports_response = client.get("/admin/reports", headers=headers)
    hidden_detail_response = client.get("/admin/reports/TRP-1003", headers=headers)

    assert reports_response.status_code == 200
    assert {report["category"] for report in reports_response.json()} == {"fire_hazard"}
    assert hidden_detail_response.status_code == 403


def test_agency_assets_are_forbidden() -> None:
    reset_user_store_for_tests()
    client = TestClient(app)
    token = _token("police.demo@citymind.local")

    response = client.get("/admin/assets", headers={"Authorization": f"Bearer {token}"})

    assert response.status_code == 403

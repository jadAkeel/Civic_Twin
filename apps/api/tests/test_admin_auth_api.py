from fastapi.testclient import TestClient

from app.main import app
from app.modules.admin.router import reset_admin_assets_for_tests
from app.modules.reports.router import reset_report_store_for_tests


def _token(email: str = "admin.demo@citymind.local") -> str:
    client = TestClient(app)
    response = client.post("/auth/login", json={"email": email})
    assert response.status_code == 200
    return response.json()["access_token"]


def test_local_auth_login_returns_placeholder_token_without_production_claim() -> None:
    client = TestClient(app)

    response = client.post("/auth/login", json={"email": "admin.demo@citymind.local"})

    assert response.status_code == 200
    payload = response.json()
    assert payload["token_type"] == "local-placeholder"
    assert payload["production_ready"] is False
    assert payload["user"]["role"] == "municipality_admin"


def test_admin_overview_requires_admin_role() -> None:
    client = TestClient(app)
    citizen_token = _token("citizen.demo@citymind.local")

    response = client.get("/admin/overview", headers={"Authorization": f"Bearer {citizen_token}"})

    assert response.status_code == 403


def test_admin_overview_returns_operations_counts_for_admin() -> None:
    reset_report_store_for_tests()
    client = TestClient(app)
    token = _token()

    response = client.get("/admin/overview", headers={"Authorization": f"Bearer {token}"})

    assert response.status_code == 200
    overview = response.json()
    assert overview["reports_total"] >= 20
    assert overview["assets_total"] >= 5
    assert overview["active_predictions"] > 0


def test_admin_can_update_report_and_asset_status() -> None:
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

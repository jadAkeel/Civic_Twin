from fastapi.testclient import TestClient

from app.main import app
from app.modules.auth.router import reset_user_store_for_tests
from app.modules.reports.router import reset_report_store_for_tests


def _admin_client() -> TestClient:
    reset_user_store_for_tests()
    client = TestClient(app)
    response = client.post(
        "/auth/login",
        json={"email": "admin.demo@citymind.local", "password": "admin-demo"},
    )
    assert response.status_code == 200
    return client


def test_dashboard_summary_returns_tripoli_operating_kpis() -> None:
    reset_report_store_for_tests()
    client = _admin_client()

    response = client.get("/dashboard/summary")

    assert response.status_code == 200
    summary = response.json()
    assert summary["kpis"]["total_reports"] >= 20
    assert summary["kpis"]["open_reports"] >= summary["kpis"]["resolved_reports"]
    assert 1 <= summary["kpis"]["average_severity"] <= 4
    assert summary["kpis"]["top_neighborhood"]
    assert summary["kpis"]["top_category"]


def test_dashboard_summary_contains_ranked_neighborhoods_categories_and_recent_reports() -> None:
    reset_report_store_for_tests()
    client = _admin_client()

    summary = client.get("/dashboard/summary").json()

    assert len(summary["top_neighborhoods"]) >= 4
    assert summary["top_neighborhoods"][0]["priority_score"] >= summary["top_neighborhoods"][1]["priority_score"]
    assert {item["category"] for item in summary["top_categories"]}
    assert len(summary["priority_areas"]) >= 3
    assert summary["recent_reports"][0]["id"].startswith("TRP-")

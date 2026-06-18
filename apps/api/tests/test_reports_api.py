from fastapi.testclient import TestClient

from app.main import app
from app.modules.reports.router import reset_report_store_for_tests


def _client() -> TestClient:
    reset_report_store_for_tests()
    return TestClient(app)


def test_reports_list_uses_tripoli_seed_data() -> None:
    client = _client()

    response = client.get("/reports")

    assert response.status_code == 200
    reports = response.json()
    assert len(reports) >= 20
    assert reports[0]["id"].startswith("TRP-")
    assert reports[0]["neighborhood"] in {"Bab Al Tebbaneh", "El Tal", "Old Souks"}


def test_reports_create_adds_ai_suggestion_and_duplicate_candidates() -> None:
    client = _client()

    response = client.post(
        "/reports",
        json={
            "title": "Garbage overflow beside Bab Al Tebbaneh homes",
            "description": "Waste bags are blocking the walking path near the existing collection point.",
            "category": "garbage",
            "severity": "high",
            "neighborhood_slug": "bab-al-tebbaneh",
            "latitude": 34.4447,
            "longitude": 35.8438,
            "image_url": "local://reports/demo-garbage.jpg",
        },
    )

    assert response.status_code == 201
    report = response.json()
    assert report["status"] == "submitted"
    assert report["neighborhood"] == "Bab Al Tebbaneh"
    assert report["ai_detected_category"] == "garbage"
    assert report["duplicate_candidates"]
    assert report["duplicate_group_id"].startswith("duplicate:")


def test_reports_status_update_is_basic_municipality_workflow() -> None:
    client = _client()

    response = client.patch("/reports/TRP-1001/status", json={"status": "in_progress"})

    assert response.status_code == 200
    assert response.json()["status"] == "in_progress"


def test_reports_suggest_category_uses_local_mock_not_paid_ai() -> None:
    client = _client()

    response = client.post(
        "/reports/suggest-category",
        json={
            "title": "Broken sidewalk near the Old Souks",
            "description": "Pedestrians are stepping into the street because the sidewalk is uneven.",
            "category": "other",
            "severity": "medium",
            "neighborhood_slug": "old-souks",
            "latitude": 34.4358,
            "longitude": 35.8446,
        },
    )

    assert response.status_code == 200
    suggestion = response.json()
    assert suggestion["category"] == "broken_sidewalk"
    assert suggestion["confidence"] > 0.5
    assert "no paid ai" in suggestion["rationale"].lower()

import os

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text

from app.db.session import SessionLocal
from app.main import app
from app.modules.health.router import EXPECTED_DATABASE_REVISION


pytestmark = pytest.mark.skipif(
    os.getenv("CITYMIND_DATABASE_INTEGRATION") != "1",
    reason="requires the PostGIS integration service",
)


def test_postgis_operational_workflow_is_durable_and_ready() -> None:
    with SessionLocal() as db:
        assert db.execute(text("SELECT PostGIS_Version()")).scalar_one()
        assert db.execute(text("SELECT version_num FROM alembic_version")).scalar_one() == EXPECTED_DATABASE_REVISION

    with TestClient(app) as client:
        login = client.post(
            "/auth/login",
            json={"email": "admin.demo@citymind.local", "password": "admin-demo"},
        )
        assert login.status_code == 200
        csrf_headers = {"X-CSRF-Token": login.json()["csrf_token"]}

        report = client.post(
            "/reports",
            headers=csrf_headers,
            json={
                "title": "Database integration pothole",
                "description": "A durable integration report used to verify the PostgreSQL workflow.",
                "category": "pothole",
                "severity": "medium",
                "neighborhood_slug": "el-tal",
                "latitude": 34.4374,
                "longitude": 35.8365,
                "manual_location": "El Tal",
                "location_source": "map",
                "image_upload_status": "none",
            },
        )
        assert report.status_code == 201
        assert client.get(f"/reports/{report.json()['id']}").status_code == 200

        assistant = client.post(
            "/assistant/query",
            headers=csrf_headers,
            json={"question": "Which reports are unresolved?"},
        )
        assert assistant.status_code == 201
        assert assistant.json()["data_sources_json"]["grounded"] is True

        assert client.get("/predictions").status_code == 200
        assert client.get("/admin/assets").status_code == 200
        ready = client.get("/ready")
        assert ready.status_code == 200
        assert ready.json()["checks"]["migrations"] == "ok"

    with SessionLocal() as db:
        assert db.execute(
            text("SELECT count(*) FROM issue_reports WHERE title = 'Database integration pothole'")
        ).scalar_one() == 1
        assert db.execute(text("SELECT count(*) FROM ai_queries")).scalar_one() >= 1
        assert db.execute(text("SELECT count(*) FROM audit_events")).scalar_one() >= 3


INTEGRATION_REPORT = {
    "title": "Integration duplicate waste",
    "description": "Two reports of the same overflowing container used to verify duplicate detection.",
    "category": "waste",
    "severity": "high",
    "neighborhood_slug": "old-souks",
    "latitude": 34.4356,
    "longitude": 35.8449,
    "manual_location": "Old Souks",
    "location_source": "map",
    "image_upload_status": "none",
}


def _session(client: TestClient, email: str, password: str) -> dict[str, str]:
    login = client.post("/auth/login", json={"email": email, "password": password})
    assert login.status_code == 200, login.text
    assert "access_token" not in login.json()
    return {"X-CSRF-Token": login.json()["csrf_token"]}


def test_database_aggregates_filters_and_duplicates_run_in_sql() -> None:
    with TestClient(app) as client:
        headers = _session(client, "admin.demo@citymind.local", "admin-demo")

        first = client.post("/reports", headers=headers, json=INTEGRATION_REPORT)
        second = client.post("/reports", headers=headers, json=INTEGRATION_REPORT)
        assert first.status_code == 201 and second.status_code == 201
        assert first.json()["id"] in second.json()["duplicate_candidates"]

        summary = client.get("/dashboard/summary")
        assert summary.status_code == 200
        kpis = summary.json()["kpis"]
        assert kpis["total_reports"] >= 2
        assert kpis["open_reports"] <= kpis["total_reports"]
        assert summary.json()["recent_reports"]

        filtered = client.get(
            "/reports",
            params={"category": "waste", "status": "submitted", "search": "duplicate waste", "limit": 5},
        )
        assert filtered.status_code == 200
        assert filtered.json()
        assert all(report["category"] == "waste" for report in filtered.json())
        # LIKE wildcards in a search term are literal, not patterns.
        assert client.get("/reports", params={"search": "%"}).json() == []

        overview = client.get("/admin/overview")
        assert overview.status_code == 200
        assert overview.json()["reports_total"] == kpis["total_reports"]
        assert overview.json()["hotspots"]


def test_agency_overview_is_scoped_to_its_category_in_sql() -> None:
    with TestClient(app) as client:
        _session(client, "police.demo@citymind.local", "agency-demo")

        overview = client.get("/admin/overview").json()
        reports = client.get("/admin/reports").json()

        assert overview["visible_categories"] == ["security_incident"]
        assert overview["reports_total"] == len(reports)
        assert {report["category"] for report in reports} <= {"security_incident"}
        assert all(hotspot["category"] == "security_incident" for hotspot in overview["hotspots"])


def test_database_mobility_uses_geojson_coordinate_order() -> None:
    with TestClient(app) as client:
        route = client.get("/mobility/routes", params={"origin": "Al Mina", "destination": "Old Souks"}).json()

    assert route["coordinate_order"] == "longitude_latitude"
    for option in route["options"]:
        for segment in option["segments"]:
            for longitude, latitude in segment["coordinates"]:
                assert 35.0 < longitude < 36.5 and 34.0 < latitude < 35.0


def test_rate_limit_buckets_persist_in_postgres() -> None:
    with TestClient(app) as client:
        for _ in range(3):
            client.post("/auth/login", json={"email": "nobody@example.com", "password": "Wrong-Pass-2026"})

    with SessionLocal() as db:
        assert db.execute(
            text("SELECT count(*) FROM rate_limit_buckets WHERE scope = 'auth.login.account'")
        ).scalar_one() >= 1


def test_database_public_assets_use_geojson_order() -> None:
    with TestClient(app) as client:
        assets = client.get("/assets/public").json()

    assert assets
    for asset in assets:
        assert "metadata_json" not in asset
        assert 35.0 < asset["longitude"] < 36.5 and 34.0 < asset["latitude"] < 35.0

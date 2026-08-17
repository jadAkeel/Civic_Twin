import os

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text

from app.db.session import SessionLocal
from app.main import app


pytestmark = pytest.mark.skipif(
    os.getenv("CITYMIND_DATABASE_INTEGRATION") != "1",
    reason="requires the PostGIS integration service",
)


def test_postgis_operational_workflow_is_durable_and_ready() -> None:
    with SessionLocal() as db:
        assert db.execute(text("SELECT PostGIS_Version()")).scalar_one()
        assert db.execute(text("SELECT version_num FROM alembic_version")).scalar_one() == "20260803_0003"

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

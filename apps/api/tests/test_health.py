from fastapi.testclient import TestClient

from app.main import app


def test_health_check_returns_citymind_tripoli_metadata() -> None:
    client = TestClient(app)

    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {
        "status": "ok",
        "service": "citymind-tripoli-api",
        "project": "CityMind Tripoli",
        "city": "Tripoli, Lebanon",
        "environment": "local",
        "version": "0.1.0",
    }


def test_health_response_includes_security_and_request_headers() -> None:
    client = TestClient(app)

    response = client.get("/health", headers={"X-Request-ID": "test-request-123"})

    assert response.status_code == 200
    assert response.headers["x-request-id"] == "test-request-123"
    assert response.headers["x-content-type-options"] == "nosniff"
    assert response.headers["x-frame-options"] == "DENY"


def test_local_readiness_reports_runtime_data_mode() -> None:
    client = TestClient(app)

    response = client.get("/ready")

    assert response.status_code == 200
    assert response.json()["status"] == "ready"
    assert response.json()["checks"]["seed_data"] == "ok"
    assert response.json()["checks"]["database"] == "not_required"
    assert response.json()["runtime_data_mode"] == "demo_seed_and_in_memory"
    assert response.json()["persistence"]["scenarios"] == "memory"

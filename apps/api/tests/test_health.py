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


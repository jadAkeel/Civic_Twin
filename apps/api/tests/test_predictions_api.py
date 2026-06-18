from fastapi.testclient import TestClient

from app.main import app
from app.modules.predictions.engine import build_predictions
from app.seed.load_seed import load_seed_file


def test_prediction_engine_builds_required_risk_types_with_evidence() -> None:
    predictions = build_predictions(load_seed_file())
    types = {prediction["prediction_type"] for prediction in predictions}

    assert {
        "congestion_risk",
        "waste_accumulation_risk",
        "infrastructure_failure_risk",
        "heat_risk",
        "service_pressure_risk",
    }.issubset(types)
    assert all(prediction["evidence_json"] for prediction in predictions)
    assert predictions[0]["risk_score"] >= predictions[-1]["risk_score"]


def test_predictions_endpoint_returns_tripoli_risk_dashboard_data() -> None:
    client = TestClient(app)

    response = client.get("/predictions")

    assert response.status_code == 200
    predictions = response.json()
    assert predictions
    assert predictions[0]["neighborhood"]
    assert 0 < predictions[0]["confidence_score"] <= 1

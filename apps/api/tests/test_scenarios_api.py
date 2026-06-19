from fastapi.testclient import TestClient

from app.main import app
from app.modules.scenarios.engine import simulate_scenario
from app.modules.scenarios.router import reset_scenario_results_for_tests


def test_scenario_engine_combines_required_outputs() -> None:
    result = simulate_scenario(["ADD_TREES", "IMPROVE_WASTE_COLLECTION"])

    assert result["green_score_delta"] == 11
    assert result["temperature_delta"] < 0
    assert result["pollution_delta"] < 0
    assert result["estimated_cost"] == 97000
    assert result["implementation_time_days"] == 80
    assert result["risk_level"] == "medium"
    assert 0 < result["confidence_score"] <= 1
    assert "\u0627\u0644\u0646\u0638\u0627\u0641\u0629" in result["recommendation"]


def test_scenario_simulation_endpoint_persists_result() -> None:
    reset_scenario_results_for_tests()
    client = TestClient(app)

    response = client.post(
        "/scenarios/simulate",
        json={
            "name": "Bab Al Tebbaneh waste and tree pilot",
            "neighborhood_slug": "bab-al-tebbaneh",
            "actions": ["ADD_TREES", "IMPROVE_WASTE_COLLECTION"],
        },
    )

    assert response.status_code == 201
    payload = response.json()
    assert payload["id"] == "scenario-result-1"
    assert payload["green_score_delta"] == 11
    assert client.get("/scenarios/results").json()[0]["id"] == "scenario-result-1"


def test_scenario_endpoint_rejects_unknown_actions() -> None:
    client = TestClient(app)

    response = client.post(
        "/scenarios/simulate",
        json={
            "name": "Invalid scenario",
            "neighborhood_slug": "al-mina",
            "actions": ["RUN_SUMO"],
        },
    )

    assert response.status_code == 422

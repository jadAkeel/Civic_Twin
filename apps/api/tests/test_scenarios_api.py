from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.seed import load_seed
from app.main import app
from app.modules.scenarios.engine import build_context_from_seed, simulate_scenario
from app.modules.scenarios.repository import save_database_result
from app.modules.scenarios.router import reset_scenario_results_for_tests


def _headers(email: str = "admin.demo@citymind.local", password: str = "admin-demo") -> dict[str, str]:
    client = TestClient(app)
    login = client.post(
        "/auth/login?include_token=true", json={"email": email, "password": password}
    )
    assert login.status_code == 200
    return {"Authorization": f"Bearer {login.json()['access_token']}"}


def _payload(**overrides: object) -> dict[str, object]:
    payload: dict[str, object] = {
        "name": "Bab Al Tebbaneh waste and tree pilot",
        "neighborhood_slug": "bab-al-tebbaneh",
        "actions": ["ADD_TREES", "IMPROVE_WASTE_COLLECTION"],
    }
    payload.update(overrides)
    return payload


def test_scenario_engine_uses_neighborhood_baseline_and_reports() -> None:
    seed = load_seed()
    bab_context = build_context_from_seed(seed, "bab-al-tebbaneh")
    mina_context = build_context_from_seed(seed, "al-mina")

    bab_result = simulate_scenario(["ADD_TREES"], bab_context)
    mina_result = simulate_scenario(["ADD_TREES"], mina_context)

    assert bab_result["green_score_delta"] > mina_result["green_score_delta"]
    assert bab_result["baseline"]["green_coverage_score"] == 34
    assert mina_result["baseline"]["green_coverage_score"] == 57
    assert bab_result["methodology"]["version"] == "scenario-v2.0"
    assert bab_result["methodology"]["official_decision_ready"] is False


def test_scenario_engine_combines_outputs_and_reports_uncertainty() -> None:
    context = build_context_from_seed(load_seed(), "bab-al-tebbaneh")

    result = simulate_scenario(
        ["ADD_TREES", "IMPROVE_WASTE_COLLECTION"],
        context,
        intensity="pilot",
        execution_mode="parallel",
        budget_limit=60_000,
    )

    assert result["green_score_delta"] > 0
    assert result["temperature_delta"] < 0
    assert result["pollution_delta"] < 0
    assert result["waste_cleanliness_delta"] > 0
    assert result["implementation_time_days"] < 80
    assert result["budget"]["within_budget"] is True
    assert result["projected_scores"]["overall_green_score"] > result["baseline"]["overall_green_score"]
    assert result["uncertainty"]["green_score_delta"]["low"] <= result["green_score_delta"]
    assert result["uncertainty"]["green_score_delta"]["high"] >= result["green_score_delta"]
    assert result["warnings"]


def test_scenario_simulation_requires_municipality_role() -> None:
    reset_scenario_results_for_tests()
    client = TestClient(app)

    unauthenticated = client.post("/scenarios/simulate", json=_payload())
    agency = client.post(
        "/scenarios/simulate",
        json=_payload(),
        headers=_headers("police.demo@citymind.local", "agency-demo"),
    )

    assert unauthenticated.status_code == 401
    assert agency.status_code == 403


def test_scenario_drafts_and_results_are_protected_but_action_catalog_is_public() -> None:
    client = TestClient(app)

    assert client.get("/scenarios").status_code == 401
    assert client.get("/scenarios/results").status_code == 401
    actions = client.get("/scenarios/actions")
    assert actions.status_code == 200
    assert actions.json()["methodology_version"] == "scenario-v2.0"


def test_scenario_simulation_endpoint_persists_versioned_result() -> None:
    reset_scenario_results_for_tests()
    client = TestClient(app)
    headers = _headers()

    response = client.post("/scenarios/simulate", json=_payload(), headers=headers)

    assert response.status_code == 201
    result = response.json()
    assert result["id"].startswith("scenario-result-")
    assert result["persistence_backend"] == "memory"
    assert result["methodology"]["version"] == "scenario-v2.0"
    assert result["baseline"]["neighborhood_slug"] == "bab-al-tebbaneh"
    assert result["projected_scores"]["waste_cleanliness_score"] > result["baseline"]["waste_cleanliness_score"]
    saved = client.get("/scenarios/results", headers=headers)
    assert saved.status_code == 200
    assert saved.json()[0]["id"] == result["id"]


def test_scenario_endpoint_rejects_unknown_or_duplicate_actions() -> None:
    client = TestClient(app)
    headers = _headers()

    unknown = client.post(
        "/scenarios/simulate",
        json=_payload(actions=["RUN_SUMO"]),
        headers=headers,
    )
    duplicate = client.post(
        "/scenarios/simulate",
        json=_payload(actions=["ADD_TREES", "ADD_TREES"]),
        headers=headers,
    )

    assert unknown.status_code == 422
    assert duplicate.status_code == 422


def test_scenario_budget_overrun_is_explicit() -> None:
    client = TestClient(app)

    response = client.post(
        "/scenarios/simulate",
        json=_payload(actions=["ADD_PARK"], budget_limit=50_000),
        headers=_headers(),
    )

    assert response.status_code == 201
    result = response.json()
    assert result["budget"]["within_budget"] is False
    assert result["budget"]["variance"] < 0
    assert any("budget" in warning.lower() for warning in result["warnings"])


def test_database_persistence_refuses_anonymous_audit_record() -> None:
    db = MagicMock(spec=Session)
    db.scalar.side_effect = [SimpleNamespace(id=7), None]
    context = build_context_from_seed(load_seed(), "bab-al-tebbaneh")
    result = simulate_scenario(["ADD_TREES"], context)

    with pytest.raises(ValueError, match="audit context"):
        save_database_result(
            db,
            name="Audited tree pilot",
            user_email="missing@example.com",
            result=result,
        )

    db.add.assert_not_called()

from __future__ import annotations

import json
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.modules.scenarios.engine import ACTION_RULES, simulate_scenario

router = APIRouter(prefix="/scenarios", tags=["scenarios"])

SEED_PATH = Path(__file__).resolve().parents[5] / "data" / "tripoli_seed.json"
_results: list[dict[str, Any]] = []


class ScenarioSimulationRequest(BaseModel):
    name: str = Field(min_length=4, max_length=180)
    neighborhood_slug: str = Field(min_length=2, max_length=120)
    actions: list[str] = Field(min_length=1, max_length=5)


def _load_seed() -> dict[str, Any]:
    return json.loads(SEED_PATH.read_text(encoding="utf-8"))


def reset_scenario_results_for_tests() -> None:
    _results.clear()


@router.get("")
def list_scenarios() -> list[dict[str, Any]]:
    seed = _load_seed()
    return seed["scenarios"]


@router.get("/actions")
def list_actions() -> dict[str, Any]:
    return {"actions": sorted(ACTION_RULES.keys())}


@router.post("/simulate", status_code=201)
def simulate(payload: ScenarioSimulationRequest) -> dict[str, Any]:
    unknown = [action for action in payload.actions if action not in ACTION_RULES]
    if unknown:
        raise HTTPException(status_code=422, detail=f"Unsupported scenario action: {', '.join(unknown)}")

    seed = _load_seed()
    neighborhoods = {item["slug"] for item in seed["neighborhoods"]}
    if payload.neighborhood_slug not in neighborhoods:
        raise HTTPException(status_code=422, detail="Unknown Tripoli neighborhood")

    result = {
        "id": f"scenario-result-{len(_results) + 1}",
        "scenario_name": payload.name,
        "neighborhood_slug": payload.neighborhood_slug,
        "actions": payload.actions,
        **simulate_scenario(payload.actions),
        "created_at": datetime.now(UTC).isoformat(),
    }
    _results.insert(0, result)
    return result


@router.get("/results")
def list_results() -> list[dict[str, Any]]:
    return _results

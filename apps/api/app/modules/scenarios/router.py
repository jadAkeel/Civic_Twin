from __future__ import annotations

import logging
from typing import Any, Literal

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel, Field, field_validator
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.core.audit import record_audit_event
from app.core.config import settings
from app.core.seed import load_seed
from app.db.session import get_db
from app.modules.auth.router import require_roles
from app.modules.scenarios.engine import ACTION_RULES, METHODOLOGY_VERSION, build_context_from_seed, simulate_scenario
from app.modules.scenarios.repository import (
    list_database_results,
    list_memory_results,
    load_database_context,
    reset_memory_results,
    save_database_result,
    save_memory_result,
)
from app.modules.simulation.adapters import simulation_engine_statuses
from app.services.city_data import load_city_snapshot


logger = logging.getLogger("citymind.scenarios")
router = APIRouter(prefix="/scenarios", tags=["scenarios"])
SCENARIO_ROLES = ("owner", "municipality_admin", "decision_maker", "analyst")


class ScenarioSimulationRequest(BaseModel):
    name: str = Field(min_length=4, max_length=180)
    neighborhood_slug: str = Field(min_length=2, max_length=120)
    actions: list[str] = Field(min_length=1, max_length=5)
    intensity: Literal["pilot", "standard", "expanded"] = "standard"
    execution_mode: Literal["parallel", "sequential"] = "sequential"
    budget_limit: float | None = Field(default=None, ge=1_000, le=100_000_000)

    @field_validator("name")
    @classmethod
    def normalize_name(cls, value: str) -> str:
        normalized = " ".join(value.split())
        if len(normalized) < 4:
            raise ValueError("Scenario name must contain at least four visible characters")
        return normalized

    @field_validator("actions")
    @classmethod
    def validate_actions(cls, value: list[str]) -> list[str]:
        if len(value) != len(set(value)):
            raise ValueError("Scenario actions must be unique")
        unknown = [action for action in value if action not in ACTION_RULES]
        if unknown:
            raise ValueError(f"Unsupported scenario action: {', '.join(unknown)}")
        return value


def _load_seed() -> dict[str, Any]:
    return load_seed()


def get_seed_scenarios() -> list[dict[str, Any]]:
    return _load_seed()["scenarios"]


def reset_scenario_results_for_tests() -> None:
    reset_memory_results()


@router.get("")
def list_scenarios(
    _: dict[str, str] = Depends(require_roles(*SCENARIO_ROLES)),
    db: Session = Depends(get_db),
) -> list[dict[str, Any]]:
    return load_city_snapshot(db, include_reports=False)["scenarios"]


@router.get("/actions")
def list_actions() -> dict[str, Any]:
    return {
        "actions": sorted(ACTION_RULES.keys()),
        "methodology_version": METHODOLOGY_VERSION,
        "intensities": ["pilot", "standard", "expanded"],
        "execution_modes": ["parallel", "sequential"],
        "engine": "citymind_transparent_rules_v2",
        "calibration_status": "uncalibrated_demo_baseline",
        "official_decision_ready": False,
    }


@router.get("/engines")
def list_simulation_engines(
    _: dict[str, str] = Depends(require_roles(*SCENARIO_ROLES)),
) -> list[dict[str, str | bool]]:
    return simulation_engine_statuses()


@router.post("/simulate", status_code=201)
def simulate(
    payload: ScenarioSimulationRequest,
    request: Request,
    user: dict[str, str] = Depends(require_roles(*SCENARIO_ROLES)),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    try:
        if settings.scenario_persistence_backend == "database":
            context = load_database_context(db, payload.neighborhood_slug)
        else:
            context = build_context_from_seed(_load_seed(), payload.neighborhood_slug)
    except SQLAlchemyError as exc:
        db.rollback()
        logger.exception("scenario_baseline_database_error")
        raise HTTPException(status_code=503, detail="Scenario baseline storage is unavailable") from exc
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    if context is None:
        raise HTTPException(status_code=422, detail="The selected neighborhood has no complete simulation baseline")

    result = simulate_scenario(
        payload.actions,
        context,
        intensity=payload.intensity,
        execution_mode=payload.execution_mode,
        budget_limit=payload.budget_limit,
    )
    try:
        if settings.scenario_persistence_backend == "database":
            stored = save_database_result(
                db,
                name=payload.name,
                user_email=user["email"],
                result=result,
            )
        else:
            stored = save_memory_result(
                name=payload.name,
                result=result,
                history_limit=settings.scenario_history_limit,
            )
        record_audit_event(
            db,
            request,
            action="scenario.simulated",
            resource_type="scenario_result",
            actor_email=user["email"],
            resource_id=stored["id"],
            details={
                "neighborhood_slug": payload.neighborhood_slug,
                "actions": payload.actions,
                "official_decision_ready": False,
            },
        )
        db.commit()
        return stored
    except (SQLAlchemyError, ValueError) as exc:
        db.rollback()
        logger.exception("scenario_result_database_error")
        raise HTTPException(status_code=503, detail="Scenario result storage is unavailable") from exc


@router.get("/results")
def list_results(
    limit: int = Query(default=50, ge=1, le=250),
    _: dict[str, str] = Depends(require_roles(*SCENARIO_ROLES)),
    db: Session = Depends(get_db),
) -> list[dict[str, Any]]:
    if settings.scenario_persistence_backend == "memory":
        return list_memory_results(limit)
    try:
        return list_database_results(db, limit)
    except SQLAlchemyError as exc:
        logger.exception("scenario_results_database_error")
        raise HTTPException(status_code=503, detail="Scenario result storage is unavailable") from exc

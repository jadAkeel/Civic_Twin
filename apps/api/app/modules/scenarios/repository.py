from __future__ import annotations

from copy import deepcopy
from datetime import UTC, datetime
from decimal import Decimal
from threading import RLock
from typing import Any
from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.models.green_metric import GreenMetric
from app.models.issue_report import IssueReport
from app.models.neighborhood import Neighborhood
from app.models.scenario import Scenario
from app.models.scenario_action import ScenarioAction
from app.models.scenario_result import ScenarioResult
from app.models.user import User
from app.models.walkability_metric import WalkabilityMetric
from app.modules.scenarios.engine import ScenarioContext, build_context_from_records


_memory_results: list[dict[str, Any]] = []
_memory_lock = RLock()


def reset_memory_results() -> None:
    with _memory_lock:
        _memory_results.clear()


def save_memory_result(
    *,
    name: str,
    result: dict[str, Any],
    history_limit: int,
) -> dict[str, Any]:
    with _memory_lock:
        stored = {
            "id": f"scenario-result-{uuid4()}",
            "scenario_name": name,
            **deepcopy(result),
            "created_at": datetime.now(UTC).isoformat(),
            "persistence_backend": "memory",
        }
        _memory_results.insert(0, stored)
        del _memory_results[history_limit:]
        return deepcopy(stored)


def list_memory_results(limit: int) -> list[dict[str, Any]]:
    with _memory_lock:
        return deepcopy(_memory_results[:limit])


def load_database_context(db: Session, neighborhood_slug: str) -> ScenarioContext | None:
    neighborhood = db.scalar(select(Neighborhood).where(Neighborhood.slug == neighborhood_slug))
    if neighborhood is None:
        return None

    green_metric = db.scalars(
        select(GreenMetric)
        .where(GreenMetric.neighborhood_id == neighborhood.id)
        .order_by(GreenMetric.measurement_date.desc(), GreenMetric.id.desc())
    ).first()
    walkability_metric = db.scalars(
        select(WalkabilityMetric)
        .where(WalkabilityMetric.neighborhood_id == neighborhood.id)
        .order_by(WalkabilityMetric.measurement_date.desc(), WalkabilityMetric.id.desc())
    ).first()
    if green_metric is None or walkability_metric is None:
        return None

    reports = list(
        db.scalars(
            select(IssueReport).where(
                IssueReport.neighborhood_id == neighborhood.id,
                IssueReport.status.in_(("submitted", "validated", "in_progress")),
            )
        ).all()
    )
    return build_context_from_records(
        neighborhood_slug=neighborhood.slug,
        neighborhood_name=neighborhood.name,
        priority_level=neighborhood.priority_level,
        green_metric=green_metric,
        walkability_metric=walkability_metric,
        reports=reports,
    )


def save_database_result(
    db: Session,
    *,
    name: str,
    user_email: str,
    result: dict[str, Any],
) -> dict[str, Any]:
    neighborhood = db.scalar(
        select(Neighborhood).where(Neighborhood.slug == result["neighborhood_slug"])
    )
    if neighborhood is None:
        raise ValueError("The selected neighborhood is unavailable in the database")
    user_id = db.scalar(select(User.id).where(User.email == user_email))
    if user_id is None:
        raise ValueError("The authenticated user is unavailable in the database audit context")
    scenario = Scenario(
        name=name,
        description=(
            f"{result['methodology']['version']} simulation for {result['neighborhood_slug']}; "
            "planning estimate only"
        ),
        neighborhood_id=neighborhood.id,
        scenario_type=str(result["actions"][0]).lower(),
        status="simulated",
        created_by_id=user_id,
    )
    db.add(scenario)
    db.flush()
    for action in result["actions"]:
        db.add(
            ScenarioAction(
                scenario_id=scenario.id,
                action_type=action,
                parameters_json={
                    "intensity": result["intensity"],
                    "execution_mode": result["execution_mode"],
                    "methodology_version": result["methodology"]["version"],
                },
            )
        )

    stored_result = ScenarioResult(
        scenario_id=scenario.id,
        green_score_delta=result["green_score_delta"],
        temperature_delta=result["temperature_delta"],
        air_quality_delta=result["air_quality_delta"],
        walkability_delta=result["walkability_delta"],
        traffic_delta=result["traffic_delta"],
        pollution_delta=result["pollution_delta"],
        estimated_cost=result["estimated_cost"],
        implementation_time_days=result["implementation_time_days"],
        risk_level=result["risk_level"],
        confidence_score=result["confidence_score"],
        recommendation=result["recommendation"],
        result_json=deepcopy(result),
    )
    db.add(stored_result)
    db.commit()
    db.refresh(stored_result)
    return _serialize_database_result(stored_result, scenario.name)


def list_database_results(db: Session, limit: int) -> list[dict[str, Any]]:
    # joinedload keeps this to one query; row.scenario.name would otherwise issue
    # one extra SELECT per result.
    rows = db.scalars(
        select(ScenarioResult)
        .options(joinedload(ScenarioResult.scenario))
        .order_by(ScenarioResult.created_at.desc(), ScenarioResult.id.desc())
        .limit(limit)
    ).all()
    return [_serialize_database_result(row, row.scenario.name if row.scenario else "") for row in rows]


def _serialize_database_result(row: ScenarioResult, scenario_name: str) -> dict[str, Any]:
    payload = deepcopy(row.result_json) if row.result_json else {
        "green_score_delta": _number(row.green_score_delta),
        "temperature_delta": _number(row.temperature_delta),
        "air_quality_delta": _number(row.air_quality_delta),
        "walkability_delta": _number(row.walkability_delta),
        "traffic_delta": _number(row.traffic_delta),
        "pollution_delta": _number(row.pollution_delta),
        "estimated_cost": _number(row.estimated_cost),
        "implementation_time_days": row.implementation_time_days,
        "risk_level": row.risk_level,
        "confidence_score": _number(row.confidence_score),
        "recommendation": row.recommendation,
    }
    return {
        "id": f"scenario-result-{row.id}",
        "scenario_name": scenario_name,
        **payload,
        "created_at": row.created_at.isoformat(),
        "persistence_backend": "database",
    }


def _number(value: Decimal | int | float) -> float:
    return float(value)

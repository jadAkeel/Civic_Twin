from __future__ import annotations

from copy import deepcopy
from decimal import Decimal
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.config import settings
from app.core.seed import load_seed
from app.models.green_metric import GreenMetric
from app.models.neighborhood import Neighborhood
from app.models.scenario import Scenario
from app.models.walkability_metric import WalkabilityMetric
from app.modules.reports.router import list_stored_reports


def load_city_snapshot(db: Session) -> dict[str, Any]:
    if settings.operational_persistence_backend != "database":
        snapshot = deepcopy(load_seed())
        snapshot["issue_reports"] = [_knowledge_report(report) for report in list_stored_reports(db)]
        snapshot.setdefault("metadata", {})["source"] = "memory_snapshot"
        return snapshot

    neighborhoods = list(db.scalars(select(Neighborhood).order_by(Neighborhood.id)).all())
    green_metrics = _latest_by_neighborhood(
        list(db.scalars(select(GreenMetric).order_by(GreenMetric.measurement_date.desc(), GreenMetric.id.desc())).all())
    )
    walkability_metrics = _latest_by_neighborhood(
        list(
            db.scalars(
                select(WalkabilityMetric).order_by(
                    WalkabilityMetric.measurement_date.desc(), WalkabilityMetric.id.desc()
                )
            ).all()
        )
    )
    neighborhood_slugs = {row.id: row.slug for row in neighborhoods}
    scenarios = list(
        db.scalars(
            select(Scenario)
            .options(selectinload(Scenario.actions))
            .order_by(Scenario.created_at.desc(), Scenario.id.desc())
        ).all()
    )
    return {
        "metadata": {
            "project": settings.project_name,
            "city": settings.city_name,
            "country": settings.country_name,
            "demo_data": True,
            "source": "database_snapshot",
        },
        "neighborhoods": [
            {
                "name": row.name,
                "slug": row.slug,
                "description": row.description,
                "city": row.city,
                "country": row.country,
                "priority_level": row.priority_level,
            }
            for row in neighborhoods
        ],
        "green_metrics": [
            {
                "neighborhood_slug": neighborhood_slugs[row.neighborhood_id],
                "air_quality_score": _number(row.air_quality_score),
                "green_coverage_score": _number(row.green_coverage_score),
                "waste_cleanliness_score": _number(row.waste_cleanliness_score),
                "walkability_score": _number(row.walkability_score),
                "heat_comfort_score": _number(row.heat_comfort_score),
                "overall_green_score": _number(row.overall_green_score),
                "measurement_date": row.measurement_date.isoformat(),
                "source": row.source,
            }
            for row in green_metrics.values()
            if row.neighborhood_id in neighborhood_slugs
        ],
        "walkability_metrics": [
            {
                "neighborhood_slug": neighborhood_slugs[row.neighborhood_id],
                "sidewalk_quality": _number(row.sidewalk_quality),
                "crossing_safety": _number(row.crossing_safety),
                "lighting_quality": _number(row.lighting_quality),
                "accessibility_score": _number(row.accessibility_score),
                "slope_comfort": _number(row.slope_comfort),
                "perceived_safety": _number(row.perceived_safety),
                "overall_walkability_score": _number(row.overall_walkability_score),
                "measurement_date": row.measurement_date.isoformat(),
                "source": row.source,
            }
            for row in walkability_metrics.values()
            if row.neighborhood_id in neighborhood_slugs
        ],
        "issue_reports": [_knowledge_report(report) for report in list_stored_reports(db)],
        "scenarios": [
            {
                "name": row.name,
                "neighborhood_slug": neighborhood_slugs.get(row.neighborhood_id, "unknown"),
                "scenario_type": row.scenario_type,
                "status": row.status,
                "actions": [{"action_type": action.action_type} for action in row.actions],
            }
            for row in scenarios
        ],
    }


def _latest_by_neighborhood(rows: list[Any]) -> dict[int, Any]:
    latest: dict[int, Any] = {}
    for row in rows:
        latest.setdefault(row.neighborhood_id, row)
    return latest


def _knowledge_report(report: dict[str, Any]) -> dict[str, Any]:
    return {
        "report_id": report["id"],
        "category": report["category"],
        "severity": report["severity"],
        "status": report["status"],
        "neighborhood_slug": report.get("neighborhood_slug"),
        "created_at": report.get("created_at"),
    }


def _number(value: Decimal | int | float) -> float:
    return float(value)

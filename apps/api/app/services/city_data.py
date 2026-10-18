from __future__ import annotations

from copy import deepcopy
from decimal import Decimal
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.config import settings
from app.core.seed import load_seed
from app.models.green_metric import GreenMetric
from app.models.issue_report import IssueReport
from app.models.neighborhood import Neighborhood
from app.models.scenario import Scenario
from app.models.walkability_metric import WalkabilityMetric
from app.modules.reports.router import _canonical_category, list_stored_reports


# Every snapshot consumer (predictions, scenarios, assistant) only looks at open
# reports, so resolved/rejected history is never read: the cost follows the open
# backlog, not every report ever filed.
OPEN_REPORT_STATUSES = ("submitted", "validated", "in_progress")


def load_city_snapshot(
    db: Session, *, include_reports: bool = True, include_scenarios: bool = True
) -> dict[str, Any]:
    """Current city data shared by scores, predictions, scenarios and the assistant.

    Callers that never look at reports (the score pages) pass include_reports=False
    so they do not pay for reading the whole report backlog.
    """
    if settings.operational_persistence_backend != "database":
        snapshot = deepcopy(load_seed())
        snapshot["issue_reports"] = (
            [_knowledge_report(report) for report in list_stored_reports(db, statuses=OPEN_REPORT_STATUSES)]
            if include_reports
            else []
        )
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
    # Each /scenarios/simulate call stores a "simulated" row. Those are run history,
    # not the planning library, so they are excluded; otherwise every public score
    # request and assistant answer would grow with the number of simulations run.
    scenarios = (
        list(
            db.scalars(
                select(Scenario)
                .options(selectinload(Scenario.actions))
                .where(Scenario.status != "simulated")
                .order_by(Scenario.created_at.desc(), Scenario.id.desc())
            ).all()
        )
        if include_scenarios
        else []
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
        "issue_reports": _database_knowledge_reports(db) if include_reports else [],
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


def _database_knowledge_reports(db: Session) -> list[dict[str, Any]]:
    """Read only the six columns the snapshot needs, without ORM objects or joins
    to users, so the cost stays proportional to the data actually used."""
    rows = db.execute(
        select(
            IssueReport.id,
            IssueReport.category,
            IssueReport.severity,
            IssueReport.status,
            Neighborhood.slug,
            IssueReport.created_at,
        )
        .outerjoin(Neighborhood, Neighborhood.id == IssueReport.neighborhood_id)
        .where(IssueReport.status.in_(OPEN_REPORT_STATUSES))
        .order_by(IssueReport.created_at.desc(), IssueReport.id.desc())
    ).all()
    return [
        {
            "report_id": f"TRP-{1000 + report_id}",
            "category": _canonical_category(category),
            "severity": severity,
            "status": status,
            "neighborhood_slug": slug,
            "created_at": created_at,
        }
        for report_id, category, severity, status, slug, created_at in rows
    ]


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

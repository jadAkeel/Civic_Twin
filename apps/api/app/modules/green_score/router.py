from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.rate_limit import enforce_rate_limit
from app.db.session import get_db
from app.modules.green_score.calculator import GREEN_WEIGHTS, calculate_green_score
from app.modules.walkability.calculator import calculate_walkability_score
from app.services.city_data import load_city_snapshot

router = APIRouter(prefix="/green-score", tags=["green-score"])


def _score_rows(db: Session) -> list[dict[str, Any]]:
    seed = load_city_snapshot(db, include_reports=False, include_scenarios=False)
    neighborhoods = {item["slug"]: item for item in seed["neighborhoods"]}
    walkability = {item["neighborhood_slug"]: item for item in seed["walkability_metrics"]}
    rows: list[dict[str, Any]] = []

    for metric in seed["green_metrics"]:
        slug = metric["neighborhood_slug"]
        green = calculate_green_score(metric)
        if slug not in neighborhoods or slug not in walkability:
            continue
        walk = calculate_walkability_score(walkability[slug])
        rows.append(
            {
                "neighborhood": neighborhoods[slug]["name"],
                "neighborhood_slug": slug,
                "priority_level": neighborhoods[slug]["priority_level"],
                "green_score": green["score"],
                "green_breakdown": green["breakdown"],
                "walkability_score": walk["score"],
                "measurement_date": metric["measurement_date"],
                "source": metric["source"],
                "formula": GREEN_WEIGHTS,
            }
        )

    return sorted(rows, key=lambda item: item["green_score"], reverse=True)


@router.get("/neighborhoods")
def list_green_scores(request: Request, db: Session = Depends(get_db)) -> list[dict[str, Any]]:
    enforce_rate_limit(
        request,
        db,
        scope="green_score.read",
        limit=settings.public_read_max_attempts,
        window_seconds=settings.public_query_window_seconds,
    )
    return _score_rows(db)


@router.get("/neighborhoods/{slug}")
def get_green_score(slug: str, request: Request, db: Session = Depends(get_db)) -> dict[str, Any]:
    enforce_rate_limit(
        request,
        db,
        scope="green_score.read",
        limit=settings.public_read_max_attempts,
        window_seconds=settings.public_query_window_seconds,
    )
    for row in _score_rows(db):
        if row["neighborhood_slug"] == slug:
            return row
    raise HTTPException(status_code=404, detail="Neighborhood score not found")

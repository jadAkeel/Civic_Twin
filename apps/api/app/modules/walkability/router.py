from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.modules.walkability.calculator import WALKABILITY_WEIGHTS, calculate_walkability_score
from app.services.city_data import load_city_snapshot

router = APIRouter(prefix="/walkability", tags=["walkability"])


def _score_rows(db: Session) -> list[dict[str, Any]]:
    seed = load_city_snapshot(db)
    neighborhoods = {item["slug"]: item for item in seed["neighborhoods"]}
    rows: list[dict[str, Any]] = []

    for metric in seed["walkability_metrics"]:
        slug = metric["neighborhood_slug"]
        if slug not in neighborhoods:
            continue
        walkability = calculate_walkability_score(metric)
        rows.append(
            {
                "neighborhood": neighborhoods[slug]["name"],
                "neighborhood_slug": slug,
                "priority_level": neighborhoods[slug]["priority_level"],
                "walkability_score": walkability["score"],
                "walkability_breakdown": walkability["breakdown"],
                "measurement_date": metric["measurement_date"],
                "source": metric["source"],
                "formula": WALKABILITY_WEIGHTS,
            }
        )

    return sorted(rows, key=lambda item: item["walkability_score"], reverse=True)


@router.get("/neighborhoods")
def list_walkability_scores(db: Session = Depends(get_db)) -> list[dict[str, Any]]:
    return _score_rows(db)


@router.get("/neighborhoods/{slug}")
def get_walkability_score(slug: str, db: Session = Depends(get_db)) -> dict[str, Any]:
    for row in _score_rows(db):
        if row["neighborhood_slug"] == slug:
            return row
    raise HTTPException(status_code=404, detail="Neighborhood walkability score not found")

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException

from app.core.seed import load_seed
from app.modules.walkability.calculator import WALKABILITY_WEIGHTS, calculate_walkability_score

router = APIRouter(prefix="/walkability", tags=["walkability"])


def _load_seed() -> dict[str, Any]:
    return load_seed()


def _score_rows() -> list[dict[str, Any]]:
    seed = _load_seed()
    neighborhoods = {item["slug"]: item for item in seed["neighborhoods"]}
    rows: list[dict[str, Any]] = []

    for metric in seed["walkability_metrics"]:
        slug = metric["neighborhood_slug"]
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
def list_walkability_scores() -> list[dict[str, Any]]:
    return _score_rows()


@router.get("/neighborhoods/{slug}")
def get_walkability_score(slug: str) -> dict[str, Any]:
    for row in _score_rows():
        if row["neighborhood_slug"] == slug:
            return row
    raise HTTPException(status_code=404, detail="Neighborhood walkability score not found")

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from fastapi import APIRouter, HTTPException

from app.modules.green_score.calculator import GREEN_WEIGHTS, calculate_green_score
from app.modules.walkability.calculator import calculate_walkability_score

router = APIRouter(prefix="/green-score", tags=["green-score"])

SEED_PATH = Path(__file__).resolve().parents[5] / "data" / "tripoli_seed.json"


def _load_seed() -> dict[str, Any]:
    return json.loads(SEED_PATH.read_text(encoding="utf-8"))


def _score_rows() -> list[dict[str, Any]]:
    seed = _load_seed()
    neighborhoods = {item["slug"]: item for item in seed["neighborhoods"]}
    walkability = {item["neighborhood_slug"]: item for item in seed["walkability_metrics"]}
    rows: list[dict[str, Any]] = []

    for metric in seed["green_metrics"]:
        slug = metric["neighborhood_slug"]
        green = calculate_green_score(metric)
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
def list_green_scores() -> list[dict[str, Any]]:
    return _score_rows()


@router.get("/neighborhoods/{slug}")
def get_green_score(slug: str) -> dict[str, Any]:
    for row in _score_rows():
        if row["neighborhood_slug"] == slug:
            return row
    raise HTTPException(status_code=404, detail="Neighborhood score not found")

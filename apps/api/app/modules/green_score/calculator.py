from __future__ import annotations

from typing import Any

GREEN_WEIGHTS = {
    "air_quality_score": 0.30,
    "green_coverage_score": 0.25,
    "waste_cleanliness_score": 0.20,
    "walkability_score": 0.15,
    "heat_comfort_score": 0.10,
}


def calculate_green_score(metric: dict[str, Any]) -> dict[str, Any]:
    breakdown = [
        {
            "factor": factor,
            "score": float(metric[factor]),
            "weight": weight,
            "contribution": round(float(metric[factor]) * weight, 2),
        }
        for factor, weight in GREEN_WEIGHTS.items()
    ]
    score = round(sum(item["contribution"] for item in breakdown), 2)
    return {
        "score": score,
        "breakdown": breakdown,
    }

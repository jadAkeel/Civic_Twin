from __future__ import annotations

from typing import Any

WALKABILITY_WEIGHTS = {
    "sidewalk_quality": 0.25,
    "crossing_safety": 0.20,
    "lighting_quality": 0.20,
    "accessibility_score": 0.15,
    "slope_comfort": 0.10,
    "perceived_safety": 0.10,
}


def calculate_walkability_score(metric: dict[str, Any]) -> dict[str, Any]:
    breakdown = [
        {
            "factor": factor,
            "score": float(metric[factor]),
            "weight": weight,
            "contribution": round(float(metric[factor]) * weight, 2),
        }
        for factor, weight in WALKABILITY_WEIGHTS.items()
    ]
    score = round(sum(item["contribution"] for item in breakdown), 2)
    return {
        "score": score,
        "breakdown": breakdown,
    }

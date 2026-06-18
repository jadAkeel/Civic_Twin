from __future__ import annotations

from typing import Any

ACTION_RULES: dict[str, dict[str, Any]] = {
    "ADD_TREES": {"green": 6, "temp": -0.4, "air": 3, "walk": 1, "traffic": 0, "pollution": -2, "cost": 42000, "days": 45, "risk": "medium", "confidence": 0.72},
    "ADD_BIKE_LANE": {"green": 2, "temp": -0.1, "air": 2, "walk": 4, "traffic": -3, "pollution": -3, "cost": 85000, "days": 75, "risk": "high", "confidence": 0.65},
    "ADD_PARK": {"green": 9, "temp": -0.7, "air": 4, "walk": 3, "traffic": 0, "pollution": -3, "cost": 180000, "days": 140, "risk": "high", "confidence": 0.61},
    "ADD_BUS_STOP": {"green": 1, "temp": 0, "air": 1, "walk": 2, "traffic": -2, "pollution": -1, "cost": 30000, "days": 30, "risk": "low", "confidence": 0.76},
    "IMPROVE_WASTE_COLLECTION": {"green": 5, "temp": -0.1, "air": 1, "walk": 1, "traffic": 0, "pollution": -4, "cost": 55000, "days": 35, "risk": "medium", "confidence": 0.78},
    "PEDESTRIANIZE_STREET": {"green": 3, "temp": -0.2, "air": 2, "walk": 7, "traffic": 4, "pollution": -3, "cost": 95000, "days": 90, "risk": "high", "confidence": 0.58},
    "CHANGE_TRAFFIC_FLOW": {"green": 1, "temp": 0, "air": 1, "walk": 1, "traffic": -5, "pollution": -2, "cost": 45000, "days": 25, "risk": "medium", "confidence": 0.69},
    "IMPROVE_SIDEWALKS": {"green": 1, "temp": 0, "air": 0, "walk": 6, "traffic": -1, "pollution": 0, "cost": 70000, "days": 60, "risk": "medium", "confidence": 0.74},
    "IMPROVE_LIGHTING": {"green": 0, "temp": 0, "air": 0, "walk": 3, "traffic": 0, "pollution": 0, "cost": 38000, "days": 28, "risk": "low", "confidence": 0.8},
}

RISK_ORDER = {"low": 1, "medium": 2, "high": 3, "critical": 4}


def simulate_scenario(actions: list[str]) -> dict[str, Any]:
    if not actions:
        raise ValueError("At least one scenario action is required")

    rules = [ACTION_RULES[action] for action in actions]
    risk = max((rule["risk"] for rule in rules), key=lambda item: RISK_ORDER[item])
    cost = sum(float(rule["cost"]) for rule in rules)
    days = sum(int(rule["days"]) for rule in rules)
    confidence = round(sum(float(rule["confidence"]) for rule in rules) / len(rules), 2)

    result = {
        "green_score_delta": round(sum(float(rule["green"]) for rule in rules), 2),
        "temperature_delta": round(sum(float(rule["temp"]) for rule in rules), 2),
        "air_quality_delta": round(sum(float(rule["air"]) for rule in rules), 2),
        "walkability_delta": round(sum(float(rule["walk"]) for rule in rules), 2),
        "traffic_delta": round(sum(float(rule["traffic"]) for rule in rules), 2),
        "pollution_delta": round(sum(float(rule["pollution"]) for rule in rules), 2),
        "estimated_cost": round(cost, 2),
        "implementation_time_days": days,
        "risk_level": risk,
        "confidence_score": confidence,
        "recommendation": _recommend(actions, risk, confidence),
    }
    return result


def _recommend(actions: list[str], risk: str, confidence: float) -> str:
    if risk == "high" and confidence < 0.65:
        return "Run a small Tripoli pilot before citywide approval."
    if "IMPROVE_WASTE_COLLECTION" in actions:
        return "Prioritize sanitation operations with neighborhood-level monitoring."
    if "IMPROVE_SIDEWALKS" in actions or "PEDESTRIANIZE_STREET" in actions:
        return "Coordinate implementation with pedestrian safety and accessibility audits."
    return "Proceed as a rule-based planning candidate and validate with local stakeholders."

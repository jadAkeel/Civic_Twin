from __future__ import annotations

from dataclasses import dataclass
from statistics import mean
from typing import Any, Literal


Number = int | float
Intensity = Literal["pilot", "standard", "expanded"]
ExecutionMode = Literal["parallel", "sequential"]

ACTION_RULES: dict[str, dict[str, Any]] = {
    "ADD_TREES": {"green": 6, "temp": -0.4, "air": 3, "walk": 1, "traffic": 0, "pollution": -2, "waste": 1, "cost": 42000, "days": 45, "risk": "medium", "confidence": 0.72},
    "ADD_BIKE_LANE": {"green": 2, "temp": -0.1, "air": 2, "walk": 4, "traffic": -3, "pollution": -3, "waste": 0, "cost": 85000, "days": 75, "risk": "high", "confidence": 0.65},
    "ADD_PARK": {"green": 9, "temp": -0.7, "air": 4, "walk": 3, "traffic": 0, "pollution": -3, "waste": 1, "cost": 180000, "days": 140, "risk": "high", "confidence": 0.61},
    "ADD_BUS_STOP": {"green": 1, "temp": 0, "air": 1, "walk": 2, "traffic": -2, "pollution": -1, "waste": 0, "cost": 30000, "days": 30, "risk": "low", "confidence": 0.76},
    "IMPROVE_WASTE_COLLECTION": {"green": 5, "temp": -0.1, "air": 1, "walk": 1, "traffic": 0, "pollution": -4, "waste": 10, "cost": 55000, "days": 35, "risk": "medium", "confidence": 0.78},
    "PEDESTRIANIZE_STREET": {"green": 3, "temp": -0.2, "air": 2, "walk": 7, "traffic": 4, "pollution": -3, "waste": 0, "cost": 95000, "days": 90, "risk": "high", "confidence": 0.58},
    "CHANGE_TRAFFIC_FLOW": {"green": 1, "temp": 0, "air": 1, "walk": 1, "traffic": -5, "pollution": -2, "waste": 0, "cost": 45000, "days": 25, "risk": "medium", "confidence": 0.69},
    "IMPROVE_SIDEWALKS": {"green": 1, "temp": 0, "air": 0, "walk": 6, "traffic": -1, "pollution": 0, "waste": 0, "cost": 70000, "days": 60, "risk": "medium", "confidence": 0.74},
    "IMPROVE_LIGHTING": {"green": 0, "temp": 0, "air": 0, "walk": 3, "traffic": 0, "pollution": 0, "waste": 0, "cost": 38000, "days": 28, "risk": "low", "confidence": 0.8},
}

RISK_ORDER = {"low": 1, "medium": 2, "high": 3, "critical": 4}
INTENSITY_MULTIPLIERS: dict[Intensity, dict[str, float]] = {
    "pilot": {"impact": 0.6, "cost": 0.55, "days": 0.7, "confidence": 0.04},
    "standard": {"impact": 1.0, "cost": 1.0, "days": 1.0, "confidence": 0.0},
    "expanded": {"impact": 1.4, "cost": 1.6, "days": 1.35, "confidence": -0.05},
}
SEVERITY_WEIGHTS = {"low": 0.2, "medium": 0.4, "high": 0.7, "critical": 1.0}
ACTIONABLE_STATUSES = {"submitted", "validated", "in_progress"}
TRAFFIC_CATEGORIES = {"traffic_congestion", "traffic_obstruction"}
POLLUTION_CATEGORIES = {"pollution", "waste", "garbage"}
METHODOLOGY_VERSION = "scenario-v2.0"


@dataclass(frozen=True)
class ScenarioContext:
    neighborhood_slug: str
    neighborhood_name: str
    priority_level: str
    baseline_date: str
    overall_green_score: float
    green_coverage_score: float
    air_quality_score: float
    waste_cleanliness_score: float
    walkability_score: float
    heat_comfort_score: float
    traffic_pressure_index: float
    pollution_pressure_index: float
    open_report_count: int
    data_sources: tuple[str, ...]

    @property
    def data_quality_score(self) -> float:
        joined_sources = " ".join(self.data_sources).lower()
        if "assumption" in joined_sources:
            return 0.55
        if "demo" in joined_sources or "seed" in joined_sources:
            return 0.68
        return 0.88

    def as_public_dict(self) -> dict[str, Any]:
        return {
            "neighborhood_slug": self.neighborhood_slug,
            "neighborhood_name": self.neighborhood_name,
            "priority_level": self.priority_level,
            "measurement_date": self.baseline_date,
            "overall_green_score": self.overall_green_score,
            "green_coverage_score": self.green_coverage_score,
            "air_quality_score": self.air_quality_score,
            "waste_cleanliness_score": self.waste_cleanliness_score,
            "walkability_score": self.walkability_score,
            "heat_comfort_score": self.heat_comfort_score,
            "traffic_pressure_index": self.traffic_pressure_index,
            "pollution_pressure_index": self.pollution_pressure_index,
            "open_report_count": self.open_report_count,
        }


def build_context_from_seed(seed: dict[str, Any], neighborhood_slug: str) -> ScenarioContext:
    neighborhood = next((item for item in seed["neighborhoods"] if item["slug"] == neighborhood_slug), None)
    green = next((item for item in seed["green_metrics"] if item["neighborhood_slug"] == neighborhood_slug), None)
    walkability = next(
        (item for item in seed["walkability_metrics"] if item["neighborhood_slug"] == neighborhood_slug),
        None,
    )
    if neighborhood is None or green is None or walkability is None:
        raise ValueError("The selected neighborhood does not have a complete simulation baseline")

    reports = [
        item
        for item in seed.get("issue_reports", [])
        if item.get("neighborhood_slug") == neighborhood_slug and item.get("status") in ACTIONABLE_STATUSES
    ]
    return _build_context(
        neighborhood_slug=neighborhood_slug,
        neighborhood_name=str(neighborhood["name"]),
        priority_level=str(neighborhood["priority_level"]),
        green=green,
        walkability=walkability,
        reports=reports,
    )


def _build_context(
    *,
    neighborhood_slug: str,
    neighborhood_name: str,
    priority_level: str,
    green: Any,
    walkability: Any,
    reports: list[Any],
) -> ScenarioContext:
    def value(source: Any, key: str) -> Any:
        return source[key] if isinstance(source, dict) else getattr(source, key)

    def report_value(report: Any, key: str) -> Any:
        return report.get(key) if isinstance(report, dict) else getattr(report, key)

    traffic_weight = sum(
        SEVERITY_WEIGHTS.get(str(report_value(report, "severity")), 0.0)
        for report in reports
        if report_value(report, "category") in TRAFFIC_CATEGORIES
    )
    pollution_weight = sum(
        SEVERITY_WEIGHTS.get(str(report_value(report, "severity")), 0.0)
        for report in reports
        if report_value(report, "category") in POLLUTION_CATEGORIES
    )
    air_quality = float(value(green, "air_quality_score"))
    waste_cleanliness = float(value(green, "waste_cleanliness_score"))
    walkability_score = float(value(walkability, "overall_walkability_score"))
    traffic_pressure = _clamp(25 + traffic_weight * 18 + (100 - walkability_score) * 0.15, 0, 100)
    pollution_pressure = _clamp(
        (100 - air_quality) * 0.65 + (100 - waste_cleanliness) * 0.25 + pollution_weight * 10,
        0,
        100,
    )
    sources = tuple(
        dict.fromkeys(
            [
                str(value(green, "source")),
                str(value(walkability, "source")),
                "issue_reports" if reports else "no_open_issue_reports",
            ]
        )
    )
    baseline_date = max(str(value(green, "measurement_date")), str(value(walkability, "measurement_date")))
    return ScenarioContext(
        neighborhood_slug=neighborhood_slug,
        neighborhood_name=neighborhood_name,
        priority_level=priority_level,
        baseline_date=baseline_date,
        overall_green_score=float(value(green, "overall_green_score")),
        green_coverage_score=float(value(green, "green_coverage_score")),
        air_quality_score=air_quality,
        waste_cleanliness_score=waste_cleanliness,
        walkability_score=walkability_score,
        heat_comfort_score=float(value(green, "heat_comfort_score")),
        traffic_pressure_index=round(traffic_pressure, 2),
        pollution_pressure_index=round(pollution_pressure, 2),
        open_report_count=len(reports),
        data_sources=sources,
    )


def build_context_from_records(
    *,
    neighborhood_slug: str,
    neighborhood_name: str,
    priority_level: str,
    green_metric: Any,
    walkability_metric: Any,
    reports: list[Any],
) -> ScenarioContext:
    return _build_context(
        neighborhood_slug=neighborhood_slug,
        neighborhood_name=neighborhood_name,
        priority_level=priority_level,
        green=green_metric,
        walkability=walkability_metric,
        reports=reports,
    )


def simulate_scenario(
    actions: list[str],
    context: ScenarioContext,
    *,
    intensity: Intensity = "standard",
    execution_mode: ExecutionMode = "sequential",
    budget_limit: float | None = None,
) -> dict[str, Any]:
    if not actions:
        raise ValueError("At least one scenario action is required")
    if len(actions) != len(set(actions)):
        raise ValueError("Scenario actions must be unique")
    unknown = [action for action in actions if action not in ACTION_RULES]
    if unknown:
        raise ValueError(f"Unsupported scenario action: {', '.join(unknown)}")

    intensity_values = INTENSITY_MULTIPLIERS[intensity]
    action_impacts = [
        _adapt_action(action, ACTION_RULES[action], context, intensity_values["impact"])
        for action in actions
    ]
    totals = {
        metric: sum(float(impact[metric]) for impact in action_impacts)
        for metric in ("green", "temp", "air", "walk", "traffic", "pollution", "waste")
    }
    interaction_notes = _apply_interactions(actions, totals)

    totals["green"] = min(totals["green"], 100 - context.overall_green_score)
    totals["air"] = min(totals["air"], 100 - context.air_quality_score)
    totals["walk"] = min(totals["walk"], 100 - context.walkability_score)
    totals["waste"] = min(totals["waste"], 100 - context.waste_cleanliness_score)
    totals = {key: round(value, 2) for key, value in totals.items()}

    base_cost = sum(float(ACTION_RULES[action]["cost"]) for action in actions)
    coordination_multiplier = 1 + max(0, len(actions) - 1) * 0.04
    cost = round(base_cost * intensity_values["cost"] * coordination_multiplier, 2)
    action_days = [max(1, round(float(ACTION_RULES[action]["days"]) * intensity_values["days"])) for action in actions]
    if execution_mode == "parallel":
        longest = max(action_days)
        days = longest + round((sum(action_days) - longest) * 0.15)
    else:
        days = sum(action_days)

    risk = max((str(ACTION_RULES[action]["risk"]) for action in actions), key=lambda item: RISK_ORDER[item])
    if intensity == "expanded" or len(actions) >= 4:
        risk = _increase_risk(risk)
    within_budget = budget_limit is None or cost <= budget_limit
    if not within_budget:
        risk = _increase_risk(risk)

    action_confidence = mean(float(ACTION_RULES[action]["confidence"]) for action in actions)
    confidence = _clamp(
        action_confidence * 0.72
        + context.data_quality_score * 0.28
        + intensity_values["confidence"]
        - max(0, len(actions) - 1) * 0.018,
        0.25,
        0.95,
    )
    confidence = round(confidence, 2)
    warnings = _warnings(context, within_budget, interaction_notes)

    projected = {
        "overall_green_score": round(_clamp(context.overall_green_score + totals["green"], 0, 100), 2),
        "air_quality_score": round(_clamp(context.air_quality_score + totals["air"], 0, 100), 2),
        "waste_cleanliness_score": round(_clamp(context.waste_cleanliness_score + totals["waste"], 0, 100), 2),
        "walkability_score": round(_clamp(context.walkability_score + totals["walk"], 0, 100), 2),
        "traffic_pressure_index": round(_clamp(context.traffic_pressure_index + totals["traffic"], 0, 100), 2),
        "pollution_pressure_index": round(_clamp(context.pollution_pressure_index + totals["pollution"], 0, 100), 2),
    }

    result: dict[str, Any] = {
        "neighborhood_slug": context.neighborhood_slug,
        "actions": actions,
        "green_score_delta": totals["green"],
        "temperature_delta": totals["temp"],
        "air_quality_delta": totals["air"],
        "walkability_delta": totals["walk"],
        "traffic_delta": totals["traffic"],
        "pollution_delta": totals["pollution"],
        "waste_cleanliness_delta": totals["waste"],
        "estimated_cost": cost,
        "implementation_time_days": days,
        "risk_level": risk,
        "confidence_score": confidence,
        "recommendation": _recommend(actions, risk, confidence, within_budget),
        "baseline": context.as_public_dict(),
        "projected_scores": projected,
        "uncertainty": {
            "green_score_delta": _estimate_range(totals["green"], confidence),
            "temperature_delta": _estimate_range(totals["temp"], confidence),
            "air_quality_delta": _estimate_range(totals["air"], confidence),
            "walkability_delta": _estimate_range(totals["walk"], confidence),
            "traffic_delta": _estimate_range(totals["traffic"], confidence),
            "pollution_delta": _estimate_range(totals["pollution"], confidence),
            "estimated_cost": _estimate_range(cost, min(confidence, 0.75)),
            "implementation_time_days": _estimate_range(days, min(confidence, 0.8), whole=True),
        },
        "budget": {
            "limit": budget_limit,
            "within_budget": within_budget,
            "variance": round((budget_limit - cost), 2) if budget_limit is not None else None,
        },
        "intensity": intensity,
        "execution_mode": execution_mode,
        "methodology": {
            "version": METHODOLOGY_VERSION,
            "model_type": "neighborhood_calibrated_rule_model",
            "official_decision_ready": False,
            "data_quality_score": context.data_quality_score,
            "sources": list(context.data_sources),
            "interaction_adjustments": interaction_notes,
            "assumptions": [
                "Action effects are calibrated planning estimates, not causal measurements.",
                "Sequential mode sums action durations; parallel mode adds coordination overhead to the longest action.",
                "Ranges express model uncertainty and do not replace an engineering feasibility study.",
            ],
        },
        "warnings": warnings,
        "action_impacts": action_impacts,
    }
    return result


def _adapt_action(
    action: str,
    rule: dict[str, Any],
    context: ScenarioContext,
    intensity_multiplier: float,
) -> dict[str, Any]:
    impact = {
        "action": action,
        "green": float(rule["green"]) * _headroom_factor(context.green_coverage_score),
        "temp": float(rule["temp"]) * _headroom_factor(context.heat_comfort_score),
        "air": float(rule["air"]) * _headroom_factor(context.air_quality_score),
        "walk": float(rule["walk"]) * _headroom_factor(context.walkability_score),
        "traffic": float(rule["traffic"]) * _pressure_factor(context.traffic_pressure_index),
        "pollution": float(rule["pollution"]) * _pressure_factor(context.pollution_pressure_index),
        "waste": float(rule["waste"]) * _headroom_factor(context.waste_cleanliness_score),
    }
    return {
        key: round(value * intensity_multiplier, 2) if key != "action" else value
        for key, value in impact.items()
    }


def _apply_interactions(actions: list[str], totals: dict[str, float]) -> list[str]:
    selected = set(actions)
    notes: list[str] = []
    if {"ADD_TREES", "ADD_PARK"}.issubset(selected):
        totals["green"] *= 0.9
        notes.append("Trees and parks share some green-coverage benefit; a 10% overlap adjustment was applied.")
    if {"ADD_BIKE_LANE", "PEDESTRIANIZE_STREET"}.issubset(selected):
        totals["walk"] += 1.5
        totals["air"] += 0.5
        notes.append("Bike and pedestrian interventions received a multimodal access synergy adjustment.")
    if {"PEDESTRIANIZE_STREET", "CHANGE_TRAFFIC_FLOW"}.issubset(selected):
        totals["traffic"] -= 1.5
        notes.append("Traffic-flow redesign offsets part of the pedestrianization traffic displacement risk.")
    if {"ADD_BUS_STOP", "ADD_BIKE_LANE"}.issubset(selected):
        totals["traffic"] -= 1.0
        notes.append("Bus and bike access received a small mode-shift synergy adjustment.")
    if {"IMPROVE_SIDEWALKS", "IMPROVE_LIGHTING"}.issubset(selected):
        totals["walk"] += 1.2
        notes.append("Sidewalk and lighting work received a pedestrian-safety synergy adjustment.")
    return notes


def _warnings(context: ScenarioContext, within_budget: bool, interaction_notes: list[str]) -> list[str]:
    warnings: list[str] = []
    if context.data_quality_score < 0.8:
        warnings.append("Baseline data is demo or assumption-backed and must be replaced before an official decision.")
    if not within_budget:
        warnings.append("The estimated cost exceeds the supplied budget limit.")
    if interaction_notes:
        warnings.append("Combined actions include modeled interactions; review their assumptions before approval.")
    if context.open_report_count < 2:
        warnings.append("Limited open-report evidence is available for this neighborhood.")
    return warnings


def _estimate_range(value: Number, confidence: float, *, whole: bool = False) -> dict[str, Number]:
    margin = abs(float(value)) * (0.12 + (1 - confidence) * 0.45)
    if value == 0:
        margin = max(margin, 0.25)
    low = float(value) - margin
    high = float(value) + margin
    if whole:
        return {"low": max(0, round(low)), "high": max(1, round(high))}
    return {"low": round(low, 2), "high": round(high, 2)}


def _headroom_factor(score: float) -> float:
    return 0.8 + (100 - _clamp(score, 0, 100)) / 200


def _pressure_factor(pressure: float) -> float:
    return 0.85 + _clamp(pressure, 0, 100) / 200


def _increase_risk(risk: str) -> str:
    current = RISK_ORDER[risk]
    return next((label for label, order in RISK_ORDER.items() if order == min(4, current + 1)), "critical")


def _clamp(value: Number, minimum: Number, maximum: Number) -> float:
    return max(float(minimum), min(float(maximum), float(value)))


def _recommend(actions: list[str], risk: str, confidence: float, within_budget: bool) -> str:
    if not within_budget:
        return "خفّض نطاق التدخل أو قسّمه إلى مراحل قبل اعتماده لأن الكلفة المقدّرة تتجاوز الميزانية المحددة."
    if risk in {"high", "critical"} or confidence < 0.65:
        return "نفّذ تجربة صغيرة في طرابلس، واجمع قياسات قبل/بعد، ثم أعد معايرة النموذج قبل التوسّع."
    if "IMPROVE_WASTE_COLLECTION" in actions:
        return "أعطِ الأولوية لعمليات النظافة مع مراقبة أسبوعية على مستوى الحي وقياس نظافة النقاط المستهدفة."
    if "IMPROVE_SIDEWALKS" in actions or "PEDESTRIANIZE_STREET" in actions:
        return "نسّق التنفيذ مع تدقيقات سلامة المشاة وإمكانية الوصول وقياسات حركة قبل/بعد."
    return "تعامل مع النتيجة كمرشح تخطيطي، وتحقق من الافتراضات مع أصحاب المصلحة والبيانات الميدانية."

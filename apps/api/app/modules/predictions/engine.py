from __future__ import annotations

from collections import Counter, defaultdict
from typing import Any

SEVERITY_BY_SCORE = [(75, "critical"), (60, "high"), (40, "medium"), (0, "low")]


def severity_for_score(score: float) -> str:
    for threshold, severity in SEVERITY_BY_SCORE:
        if score >= threshold:
            return severity
    return "low"


def build_predictions(seed: dict[str, Any]) -> list[dict[str, Any]]:
    neighborhoods = {item["slug"]: item for item in seed["neighborhoods"]}
    reports_by_area: defaultdict[str, list[dict[str, Any]]] = defaultdict(list)
    for report in seed["issue_reports"]:
        reports_by_area[report["neighborhood_slug"]].append(report)

    green_by_area = {item["neighborhood_slug"]: item for item in seed["green_metrics"]}
    predictions: list[dict[str, Any]] = []

    for slug, reports in reports_by_area.items():
        categories = Counter(report["category"] for report in reports)
        high_count = sum(1 for report in reports if report["severity"] in {"high", "critical"})
        green = green_by_area.get(slug, {})

        candidates = [
            (
                "congestion_risk",
                categories["traffic_obstruction"] * 28 + high_count * 5,
                24,
                {"traffic_reports": categories["traffic_obstruction"], "high_severity_reports": high_count},
            ),
            (
                "waste_accumulation_risk",
                categories["garbage"] * 30 + max(0, 55 - float(green.get("waste_cleanliness_score", 55))),
                48,
                {"garbage_reports": categories["garbage"], "waste_cleanliness_score": green.get("waste_cleanliness_score")},
            ),
            (
                "infrastructure_failure_risk",
                (categories["broken_sidewalk"] + categories["street_lighting"] + categories["pothole"]) * 22,
                72,
                {
                    "broken_sidewalk": categories["broken_sidewalk"],
                    "street_lighting": categories["street_lighting"],
                    "pothole": categories["pothole"],
                },
            ),
            (
                "heat_risk",
                max(0, 65 - float(green.get("heat_comfort_score", 65))) + max(0, 55 - float(green.get("green_coverage_score", 55))),
                168,
                {"heat_comfort_score": green.get("heat_comfort_score"), "green_coverage_score": green.get("green_coverage_score")},
            ),
            (
                "service_pressure_risk",
                len(reports) * 12 + high_count * 8,
                72,
                {"total_reports": len(reports), "high_severity_reports": high_count},
            ),
        ]

        for prediction_type, score, window, evidence in candidates:
            if score < 35:
                continue
            predictions.append(
                {
                    "id": f"{prediction_type}:{slug}",
                    "prediction_type": prediction_type,
                    "neighborhood": neighborhoods[slug]["name"],
                    "neighborhood_slug": slug,
                    "severity": severity_for_score(score),
                    "confidence_score": round(min(0.9, 0.45 + score / 180), 2),
                    "risk_score": round(min(score, 100), 1),
                    "prediction_window_hours": window,
                    "message": f"Rule-based {prediction_type.replace('_', ' ')} signal for {neighborhoods[slug]['name']}.",
                    "evidence_json": {"demo": True, **evidence},
                }
            )

    return sorted(predictions, key=lambda item: (item["risk_score"], item["confidence_score"]), reverse=True)

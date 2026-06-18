from __future__ import annotations

from collections import Counter, defaultdict
from typing import Any

SEVERITY_SCORE = {
    "low": 1,
    "medium": 2,
    "high": 3,
    "critical": 4,
}

OPEN_STATUSES = {"submitted", "validated", "in_progress"}


def build_report_aggregates(reports: list[dict[str, Any]]) -> dict[str, Any]:
    total_reports = len(reports)
    open_reports = sum(1 for report in reports if report["status"] in OPEN_STATUSES)
    resolved_reports = sum(1 for report in reports if report["status"] == "resolved")
    severity_total = sum(SEVERITY_SCORE.get(str(report["severity"]), 0) for report in reports)
    average_severity = round(severity_total / total_reports, 2) if total_reports else 0

    neighborhood_stats: dict[str, dict[str, Any]] = {}
    neighborhood_open: defaultdict[str, int] = defaultdict(int)
    neighborhood_critical: defaultdict[str, int] = defaultdict(int)
    category_counts: Counter[str] = Counter()

    for report in reports:
        slug = str(report["neighborhood_slug"])
        neighborhood_stats.setdefault(
            slug,
            {
                "name": report["neighborhood"],
                "slug": slug,
                "total_reports": 0,
                "open_reports": 0,
                "critical_reports": 0,
                "priority_score": 0,
            },
        )
        neighborhood_stats[slug]["total_reports"] += 1
        category_counts.update([str(report["category"])])

        if report["status"] in OPEN_STATUSES:
            neighborhood_stats[slug]["open_reports"] += 1
            neighborhood_open[slug] += 1
        if report["severity"] == "critical":
            neighborhood_stats[slug]["critical_reports"] += 1
            neighborhood_critical[slug] += 1

    for slug, stats in neighborhood_stats.items():
        stats["priority_score"] = stats["open_reports"] * 2 + stats["critical_reports"] * 4 + stats["total_reports"]

    top_neighborhoods = sorted(
        neighborhood_stats.values(),
        key=lambda stats: (stats["priority_score"], stats["open_reports"], stats["total_reports"]),
        reverse=True,
    )[:6]

    top_categories = [
        {"category": category, "total_reports": count}
        for category, count in category_counts.most_common(6)
    ]

    priority_areas = [
        {
            "name": stats["name"],
            "slug": stats["slug"],
            "score": stats["priority_score"],
            "reason": _priority_reason(stats),
        }
        for stats in top_neighborhoods[:4]
    ]

    return {
        "kpis": {
            "total_reports": total_reports,
            "open_reports": open_reports,
            "resolved_reports": resolved_reports,
            "average_severity": average_severity,
            "top_neighborhood": top_neighborhoods[0]["name"] if top_neighborhoods else None,
            "top_category": top_categories[0]["category"] if top_categories else None,
        },
        "top_neighborhoods": top_neighborhoods,
        "top_categories": top_categories,
        "priority_areas": priority_areas,
        "recent_reports": reports[:8],
    }


def _priority_reason(stats: dict[str, Any]) -> str:
    if stats["critical_reports"]:
        return "Critical reports and unresolved citizen tickets are concentrated here."
    if stats["open_reports"] >= 3:
        return "Open municipal workload is above the Tripoli demo baseline."
    return "Recurring reports keep this area on the operating watchlist."

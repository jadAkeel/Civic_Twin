from __future__ import annotations

from collections import Counter, defaultdict
from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    from sqlalchemy.orm import Session

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
        category_counts.update([str(report["category"])])
        # Manually located reports have no neighbourhood; the SQL path excludes them
        # from per-area stats through its join, so they must not become "None" here.
        if not report.get("neighborhood_slug"):
            continue
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

        if report["status"] in OPEN_STATUSES:
            neighborhood_stats[slug]["open_reports"] += 1
            neighborhood_open[slug] += 1
        if report["severity"] == "critical":
            neighborhood_stats[slug]["critical_reports"] += 1
            neighborhood_critical[slug] += 1

    for stats in neighborhood_stats.values():
        stats["priority_score"] = stats["open_reports"] * 2 + stats["critical_reports"] * 4 + stats["total_reports"]

    top_neighborhoods = sorted(
        neighborhood_stats.values(),
        key=_neighborhood_rank,
    )[:6]

    top_categories = [
        {"category": category, "total_reports": count}
        for category, count in sorted(category_counts.items(), key=lambda item: (-item[1], item[0]))[:6]
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


def _neighborhood_rank(stats: dict[str, Any]) -> tuple[int, int, int, str]:
    """Highest priority first; ties broken by slug so both persistence modes agree."""
    return (-stats["priority_score"], -stats["open_reports"], -stats["total_reports"], str(stats["slug"]))


def _priority_reason(stats: dict[str, Any]) -> str:
    if stats["critical_reports"]:
        return "تتركز هنا بلاغات حرجة وبلاغات مواطنين غير محلولة."
    if stats["open_reports"] >= 3:
        return "عبء العمل البلدي المفتوح أعلى من خط الأساس التجريبي في طرابلس."
    return "تكرار البلاغات يبقي هذه المنطقة على قائمة المتابعة التشغيلية."


def build_database_report_aggregates(db: "Session", recent: list[dict[str, Any]]) -> dict[str, Any]:
    """Compute dashboard KPIs with GROUP BY instead of loading every report into memory."""
    from sqlalchemy import case, func, select

    from app.models.issue_report import IssueReport
    from app.models.neighborhood import Neighborhood

    severity_score = case(SEVERITY_SCORE, value=IssueReport.severity, else_=0)
    is_open = case((IssueReport.status.in_(OPEN_STATUSES), 1), else_=0)
    is_critical = case((IssueReport.severity == "critical", 1), else_=0)

    totals = db.execute(
        select(
            func.count(IssueReport.id),
            func.coalesce(func.sum(is_open), 0),
            func.coalesce(func.sum(case((IssueReport.status == "resolved", 1), else_=0)), 0),
            func.coalesce(func.avg(severity_score), 0),
        )
    ).one()
    total_reports, open_reports, resolved_reports, average_severity = totals

    neighborhood_rows = db.execute(
        select(
            Neighborhood.name,
            Neighborhood.slug,
            func.count(IssueReport.id).label("total_reports"),
            func.coalesce(func.sum(is_open), 0).label("open_reports"),
            func.coalesce(func.sum(is_critical), 0).label("critical_reports"),
        )
        .join(Neighborhood, Neighborhood.id == IssueReport.neighborhood_id)
        .group_by(Neighborhood.name, Neighborhood.slug)
    ).all()

    neighborhood_stats = [
        {
            "name": name,
            "slug": slug,
            "total_reports": int(total),
            "open_reports": int(open_count),
            "critical_reports": int(critical),
            "priority_score": int(open_count) * 2 + int(critical) * 4 + int(total),
        }
        for name, slug, total, open_count, critical in neighborhood_rows
    ]
    top_neighborhoods = sorted(
        neighborhood_stats,
        key=_neighborhood_rank,
    )[:6]

    category_rows = db.execute(
        select(IssueReport.category, func.count(IssueReport.id))
        .group_by(IssueReport.category)
        .order_by(func.count(IssueReport.id).desc(), IssueReport.category)
        .limit(6)
    ).all()
    top_categories = [{"category": category, "total_reports": int(count)} for category, count in category_rows]

    return {
        "kpis": {
            "total_reports": int(total_reports),
            "open_reports": int(open_reports),
            "resolved_reports": int(resolved_reports),
            "average_severity": round(float(average_severity), 2),
            "top_neighborhood": top_neighborhoods[0]["name"] if top_neighborhoods else None,
            "top_category": top_categories[0]["category"] if top_categories else None,
        },
        "top_neighborhoods": top_neighborhoods,
        "top_categories": top_categories,
        "priority_areas": [
            {
                "name": stats["name"],
                "slug": stats["slug"],
                "score": stats["priority_score"],
                "reason": _priority_reason(stats),
            }
            for stats in top_neighborhoods[:4]
        ],
        "recent_reports": recent[:8],
    }

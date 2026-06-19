from __future__ import annotations

from copy import deepcopy
from datetime import UTC, datetime
from typing import Any

from fastapi import APIRouter, HTTPException, Query

from app.core.seed import load_seed
from app.schemas.reports import ReportCategorySuggestion, ReportCreate, ReportImageAnalysis, ReportRead, ReportStatusUpdate

router = APIRouter(prefix="/reports", tags=["reports"])

CATEGORY_KEYWORDS: dict[str, tuple[str, ...]] = {
    "waste": ("garbage", "waste", "trash", "overflow", "collection"),
    "traffic_congestion": ("traffic", "congestion", "blocked", "obstruction", "crossing"),
    "pothole": ("pothole", "road hole", "asphalt"),
    "security_incident": ("safety", "unsafe", "hazard", "risk", "security", "incident"),
    "medical_emergency": ("medical", "injury", "injured", "ambulance", "first aid", "red cross"),
    "fire_hazard": ("fire", "smoke", "burning", "civil defense", "explosion"),
}

LEGACY_CATEGORY_MAP = {
    "garbage": "waste",
    "traffic_obstruction": "traffic_congestion",
    "public_safety": "security_incident",
    "broken_sidewalk": "pothole",
    "street_lighting": "other",
    "water_leakage": "other",
    "accessibility_issue": "other",
    "pollution": "other",
}

_reports: list[dict[str, Any]] | None = None
_neighborhoods: dict[str, dict[str, Any]] | None = None


def _now() -> datetime:
    return datetime.now(UTC)


def _load_seed() -> dict[str, Any]:
    return load_seed()


def _slug_to_name(slug: str) -> str:
    neighborhoods = _get_neighborhoods()
    if slug not in neighborhoods:
        raise HTTPException(status_code=422, detail=f"Unknown Tripoli neighborhood: {slug}")
    return str(neighborhoods[slug]["name"])


def _canonical_category(category: str) -> str:
    return LEGACY_CATEGORY_MAP.get(category, category)


def _analysis_for_category(category: str) -> ReportImageAnalysis:
    if category in {"security_incident", "medical_emergency", "fire_hazard"}:
        agency = {
            "security_incident": "الشرطة",
            "medical_emergency": "الصليب الأحمر اللبناني",
            "fire_hazard": "الدفاع المدني",
        }[category]
        return ReportImageAnalysis(
            status="manual_review_required",
            provider=None,
            message=(
                f"توجيه {agency} غير مهيأ. هذا البلاغ يتطلب مراجعة يدوية. "
                "في حال وجود خطر فوري، تواصل مع خدمات الطوارئ."
            ),
        )

    return ReportImageAnalysis(
        status="not_configured",
        provider=None,
        message="خدمة تحليل الصور الآلي غير مهيأة بعد. تم إرسال هذا البلاغ من دون تحليل صور آلي.",
    )


def _get_neighborhoods() -> dict[str, dict[str, Any]]:
    global _neighborhoods
    if _neighborhoods is None:
        seed = _load_seed()
        _neighborhoods = {item["slug"]: item for item in seed["neighborhoods"]}
    return _neighborhoods


def _seed_reports() -> list[dict[str, Any]]:
    seed = _load_seed()
    seeded_at = _now()
    reports: list[dict[str, Any]] = []

    for index, report in enumerate(seed["issue_reports"], start=1):
        neighborhood_slug = report["neighborhood_slug"]
        reports.append(
            {
                "id": f"TRP-{1000 + index}",
                "title": report["title"],
                "description": report["description"],
                "category": _canonical_category(str(report["category"])),
                "severity": report["severity"],
                "status": report["status"],
                "neighborhood": _slug_to_name(neighborhood_slug),
                "neighborhood_slug": neighborhood_slug,
                "latitude": float(report["latitude"]),
                "longitude": float(report["longitude"]),
                "manual_location": None,
                "location_source": "demo_seed",
                "image_url": report.get("image_url"),
                "image_upload_status": "none",
                "image_metadata": None,
                "analysis_status": "not_configured",
                "image_analysis": _analysis_for_category(_canonical_category(str(report["category"]))).model_dump(),
                "duplicate_group_id": report.get("duplicate_group_id"),
                "duplicate_candidates": [],
                "created_at": seeded_at,
                "updated_at": seeded_at,
            }
        )

    return reports


def _store() -> list[dict[str, Any]]:
    global _reports
    if _reports is None:
        _reports = _seed_reports()
    return _reports


def reset_report_store_for_tests() -> None:
    global _reports, _neighborhoods
    _reports = None
    _neighborhoods = None


def _suggest_category(title: str, description: str) -> tuple[str, float, str]:
    text = f"{title} {description}".lower()
    scores = {
        category: sum(1 for keyword in keywords if keyword in text)
        for category, keywords in CATEGORY_KEYWORDS.items()
    }
    best_category, score = max(scores.items(), key=lambda item: item[1])

    if score == 0:
        return "other", 0.0, "Keyword helper only; no automated image analysis or model inference was performed."

    confidence = min(0.7, 0.45 + score * 0.08)
    return best_category, confidence, "Keyword helper only; no automated image analysis or model inference was performed."


def _duplicate_candidates(
    *,
    category: str,
    neighborhood_slug: str,
    latitude: float,
    longitude: float,
    exclude_id: str | None = None,
) -> list[str]:
    candidates: list[str] = []
    for report in _store():
        if report["id"] == exclude_id:
            continue
        same_area = report["neighborhood_slug"] == neighborhood_slug
        same_category = report["category"] == category
        report_latitude = report.get("latitude")
        report_longitude = report.get("longitude")
        nearby = (
            report_latitude is not None
            and report_longitude is not None
            and abs(float(report_latitude) - latitude) <= 0.0012
            and abs(float(report_longitude) - longitude) <= 0.0012
        )
        still_actionable = report["status"] not in {"resolved", "rejected"}
        if same_area and same_category and nearby and still_actionable:
            candidates.append(str(report["id"]))
    return candidates


def _serialize(report: dict[str, Any]) -> ReportRead:
    return ReportRead(**deepcopy(report))


@router.get("", response_model=list[ReportRead])
def list_reports(
    category: str | None = None,
    severity: str | None = None,
    status: str | None = None,
    neighborhood_slug: str | None = None,
    search: str | None = Query(default=None, max_length=120),
) -> list[ReportRead]:
    reports = _store()

    if category:
        reports = [report for report in reports if report["category"] == category]
    if severity:
        reports = [report for report in reports if report["severity"] == severity]
    if status:
        reports = [report for report in reports if report["status"] == status]
    if neighborhood_slug:
        reports = [report for report in reports if report["neighborhood_slug"] == neighborhood_slug]
    if search:
        needle = search.lower()
        reports = [
            report
            for report in reports
            if needle in report["title"].lower() or needle in report["description"].lower()
        ]

    return [_serialize(report) for report in reports]


@router.post("", response_model=ReportRead, status_code=201)
def create_report(payload: ReportCreate) -> ReportRead:
    reports = _store()
    duplicates = (
        _duplicate_candidates(
            category=payload.category,
            neighborhood_slug=payload.neighborhood_slug,
            latitude=payload.latitude,
            longitude=payload.longitude,
        )
        if payload.neighborhood_slug and payload.latitude is not None and payload.longitude is not None
        else []
    )
    created_at = _now()
    neighborhood = _slug_to_name(payload.neighborhood_slug) if payload.neighborhood_slug else "موقع يدوي في طرابلس"
    image_analysis = _analysis_for_category(payload.category)
    report = {
        "id": f"TRP-{1001 + len(reports)}",
        "title": payload.title,
        "description": payload.description,
        "category": payload.category,
        "severity": payload.severity,
        "status": "submitted",
        "neighborhood": neighborhood,
        "neighborhood_slug": payload.neighborhood_slug,
        "latitude": payload.latitude,
        "longitude": payload.longitude,
        "manual_location": payload.manual_location,
        "location_source": payload.location_source,
        "image_url": payload.image_url,
        "image_upload_status": payload.image_upload_status,
        "image_metadata": payload.image_metadata.model_dump() if payload.image_metadata else None,
        "analysis_status": image_analysis.status,
        "image_analysis": image_analysis.model_dump(),
        "duplicate_group_id": f"duplicate:{duplicates[0]}" if duplicates else None,
        "duplicate_candidates": duplicates,
        "created_at": created_at,
        "updated_at": created_at,
    }
    reports.insert(0, report)
    return _serialize(report)


@router.get("/{report_id}", response_model=ReportRead)
def get_report(report_id: str) -> ReportRead:
    for report in _store():
        if report["id"] == report_id:
            return _serialize(report)
    raise HTTPException(status_code=404, detail="Report not found")


@router.patch("/{report_id}/status", response_model=ReportRead)
def update_report_status(report_id: str, payload: ReportStatusUpdate) -> ReportRead:
    for report in _store():
        if report["id"] == report_id:
            report["status"] = payload.status
            report["updated_at"] = _now()
            return _serialize(report)
    raise HTTPException(status_code=404, detail="Report not found")


@router.post("/suggest-category", response_model=ReportCategorySuggestion)
def suggest_category(payload: ReportCreate) -> ReportCategorySuggestion:
    category, confidence, rationale = _suggest_category(payload.title, payload.description)
    duplicates = _duplicate_candidates(
        category=category,
        neighborhood_slug=payload.neighborhood_slug,
        latitude=payload.latitude,
        longitude=payload.longitude,
    ) if payload.neighborhood_slug and payload.latitude is not None and payload.longitude is not None else []
    return ReportCategorySuggestion(
        category=category,
        confidence=confidence,
        rationale=rationale,
        duplicate_candidates=duplicates,
    )

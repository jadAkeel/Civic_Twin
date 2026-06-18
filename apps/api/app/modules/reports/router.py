from __future__ import annotations

import json
from copy import deepcopy
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from fastapi import APIRouter, HTTPException, Query

from app.schemas.reports import ReportCategorySuggestion, ReportCreate, ReportRead, ReportStatusUpdate

router = APIRouter(prefix="/reports", tags=["reports"])

SEED_PATH = Path(__file__).resolve().parents[5] / "data" / "tripoli_seed.json"

CATEGORY_KEYWORDS: dict[str, tuple[str, ...]] = {
    "garbage": ("garbage", "waste", "trash", "overflow", "collection"),
    "broken_sidewalk": ("sidewalk", "walkway", "pedestrian path", "pavement"),
    "street_lighting": ("lighting", "light", "dark", "visibility", "night"),
    "traffic_obstruction": ("traffic", "congestion", "blocked", "obstruction", "crossing"),
    "pothole": ("pothole", "road hole", "asphalt"),
    "water_leakage": ("water", "leak", "leakage", "pipe"),
    "accessibility_issue": ("accessibility", "wheelchair", "barrier", "stairs", "slope"),
    "pollution": ("pollution", "air", "noise", "smell", "exposure"),
    "public_safety": ("safety", "unsafe", "hazard", "risk"),
}

_reports: list[dict[str, Any]] | None = None
_neighborhoods: dict[str, dict[str, Any]] | None = None


def _now() -> datetime:
    return datetime.now(UTC)


def _load_seed() -> dict[str, Any]:
    return json.loads(SEED_PATH.read_text(encoding="utf-8"))


def _slug_to_name(slug: str) -> str:
    neighborhoods = _get_neighborhoods()
    if slug not in neighborhoods:
        raise HTTPException(status_code=422, detail=f"Unknown Tripoli neighborhood: {slug}")
    return str(neighborhoods[slug]["name"])


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
                "category": report["category"],
                "severity": report["severity"],
                "status": report["status"],
                "neighborhood": _slug_to_name(neighborhood_slug),
                "neighborhood_slug": neighborhood_slug,
                "latitude": float(report["latitude"]),
                "longitude": float(report["longitude"]),
                "image_url": report.get("image_url"),
                "ai_detected_category": report.get("ai_detected_category"),
                "ai_confidence": report.get("ai_confidence"),
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
        return "other", 0.42, "No strong Tripoli issue keyword matched; using a conservative fallback."

    confidence = min(0.92, 0.55 + score * 0.12)
    return best_category, confidence, "Keyword-based local mock suggestion; no paid AI was called."


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
        nearby = abs(float(report["latitude"]) - latitude) <= 0.0012 and abs(float(report["longitude"]) - longitude) <= 0.0012
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
    category, confidence, _ = _suggest_category(payload.title, payload.description)
    duplicates = _duplicate_candidates(
        category=payload.category,
        neighborhood_slug=payload.neighborhood_slug,
        latitude=payload.latitude,
        longitude=payload.longitude,
    )
    created_at = _now()
    report = {
        "id": f"TRP-{1001 + len(reports)}",
        "title": payload.title,
        "description": payload.description,
        "category": payload.category,
        "severity": payload.severity,
        "status": "submitted",
        "neighborhood": _slug_to_name(payload.neighborhood_slug),
        "neighborhood_slug": payload.neighborhood_slug,
        "latitude": payload.latitude,
        "longitude": payload.longitude,
        "image_url": payload.image_url,
        "ai_detected_category": category,
        "ai_confidence": confidence,
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
    )
    return ReportCategorySuggestion(
        category=category,
        confidence=confidence,
        rationale=rationale,
        duplicate_candidates=duplicates,
    )

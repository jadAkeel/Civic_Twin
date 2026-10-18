from __future__ import annotations

from copy import deepcopy
from datetime import UTC, datetime
from threading import RLock
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from geoalchemy2 import WKTElement
from sqlalchemy import and_, func, or_, select
from sqlalchemy.orm import Session, joinedload

from app.core.audit import record_audit_event
from app.core.config import settings
from app.core.rate_limit import enforce_rate_limit
from app.core.seed import load_seed
from app.db.session import get_db
from app.models.issue_report import IssueReport
from app.models.neighborhood import Neighborhood
from app.models.user import User
from app.modules.auth.router import current_user, require_roles
from app.schemas.reports import (
    PublicReportRead,
    ReportCategory,
    ReportSeverity,
    ReportStatus,
    ReportCategorySuggestion,
    ReportCreate,
    ReportImageAnalysis,
    ReportRead,
    ReportStatusUpdate,
    contains_control_characters,
)

router = APIRouter(prefix="/reports", tags=["reports"])
REPORT_STATUS_ROLES = ("owner", "municipality_admin", "decision_maker", "analyst")
REPORT_INTERNAL_VIEW_ROLES = REPORT_STATUS_ROLES
REPORT_STATUS_TRANSITIONS = {
    "submitted": {"validated", "in_progress", "rejected", "duplicate"},
    "validated": {"in_progress", "rejected", "duplicate"},
    "in_progress": {"resolved", "rejected"},
    "resolved": set(),
    "rejected": set(),
    "duplicate": set(),
}

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
_store_lock = RLock()


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
                "created_by_email": report.get("created_by_email"),
                "created_at": seeded_at,
                "updated_at": seeded_at,
            }
        )

    return reports


def _store() -> list[dict[str, Any]]:
    global _reports
    with _store_lock:
        if _reports is None:
            _reports = _seed_reports()
        return _reports


def reset_report_store_for_tests() -> None:
    global _reports, _neighborhoods
    with _store_lock:
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


SENSITIVE_CATEGORIES = frozenset({"security_incident", "medical_emergency", "fire_hazard"})
# The public feed lists reports that are still relevant to residents; rejected and
# duplicate reports are internal outcomes.
PUBLIC_FEED_STATUSES = ("submitted", "validated", "in_progress", "resolved")
# Citizen-written titles are only published once staff have reviewed the report.
PUBLIC_TITLE_STATUSES = frozenset({"validated", "in_progress", "resolved"})
POSTGRES_INTEGER_MAX = 2_147_483_647

DUPLICATE_DEGREE_RADIUS = 0.0012
DUPLICATE_ACTIONABLE_STATUSES = ("submitted", "validated", "in_progress", "duplicate")
MAX_DUPLICATE_CANDIDATES = 10


def _duplicate_candidates(
    *,
    category: str,
    neighborhood_slug: str,
    latitude: float,
    longitude: float,
    exclude_id: str | None = None,
    db: Session | None = None,
) -> list[str]:
    """Find open reports of the same kind within roughly 130 m.

    In database mode the proximity test runs in SQL against an indexed column set,
    so submitting a report stays O(matches) rather than O(all reports).
    """
    if settings.operational_persistence_backend == "database":
        if db is None:
            raise RuntimeError("A database session is required for report persistence")
        statement = (
            select(IssueReport.id)
            .join(Neighborhood, Neighborhood.id == IssueReport.neighborhood_id)
            .where(
                Neighborhood.slug == neighborhood_slug,
                IssueReport.category == category,
                IssueReport.status.in_(DUPLICATE_ACTIONABLE_STATUSES),
                IssueReport.latitude.is_not(None),
                IssueReport.longitude.is_not(None),
                and_(
                    func.abs(IssueReport.latitude - latitude) <= DUPLICATE_DEGREE_RADIUS,
                    func.abs(IssueReport.longitude - longitude) <= DUPLICATE_DEGREE_RADIUS,
                ),
            )
            .order_by(IssueReport.created_at.desc(), IssueReport.id.desc())
            .limit(MAX_DUPLICATE_CANDIDATES + 1)
        )
        found = [f"TRP-{1000 + row}" for row in db.scalars(statement).all()]
        return [report_id for report_id in found if report_id != exclude_id][:MAX_DUPLICATE_CANDIDATES]

    candidates: list[str] = []
    for report in list_stored_reports(db):
        if report["id"] == exclude_id:
            continue
        same_area = report["neighborhood_slug"] == neighborhood_slug
        same_category = report["category"] == category
        report_latitude = report.get("latitude")
        report_longitude = report.get("longitude")
        nearby = (
            report_latitude is not None
            and report_longitude is not None
            and abs(float(report_latitude) - latitude) <= DUPLICATE_DEGREE_RADIUS
            and abs(float(report_longitude) - longitude) <= DUPLICATE_DEGREE_RADIUS
        )
        still_actionable = report["status"] not in {"resolved", "rejected"}
        if same_area and same_category and nearby and still_actionable:
            candidates.append(str(report["id"]))
        if len(candidates) >= MAX_DUPLICATE_CANDIDATES:
            break
    return candidates


def _serialize(report: dict[str, Any]) -> ReportRead:
    return ReportRead(**deepcopy(report))


def _database_report_id(report_id: str) -> int:
    try:
        numeric_id = int(report_id.removeprefix("TRP-")) - 1000
    except ValueError as exc:
        raise HTTPException(status_code=404, detail="Report not found") from exc
    # Out-of-range ids would make PostgreSQL raise "integer out of range" (a 500).
    if numeric_id < 1 or numeric_id > POSTGRES_INTEGER_MAX:
        raise HTTPException(status_code=404, detail="Report not found")
    return numeric_id


def _database_report_to_dict(report: IssueReport) -> dict[str, Any]:
    category = _canonical_category(report.category)
    image_analysis = report.image_analysis or _analysis_for_category(category).model_dump(mode="json")
    neighborhood_name = report.neighborhood.name if report.neighborhood else "موقع يدوي في طرابلس"
    return {
        "id": f"TRP-{1000 + report.id}",
        "title": report.title,
        "description": report.description,
        "category": category,
        "severity": report.severity,
        "status": report.status,
        "neighborhood": neighborhood_name,
        "neighborhood_slug": report.neighborhood.slug if report.neighborhood else None,
        "latitude": float(report.latitude) if report.latitude is not None else None,
        "longitude": float(report.longitude) if report.longitude is not None else None,
        "manual_location": report.manual_location,
        "location_source": report.location_source,
        "image_url": report.image_url,
        "image_upload_status": report.image_upload_status,
        "image_metadata": report.image_metadata or None,
        "analysis_status": report.analysis_status,
        "image_analysis": image_analysis,
        "duplicate_group_id": report.duplicate_group_id,
        "duplicate_candidates": list(report.duplicate_candidates or []),
        "created_by_email": report.created_by.email if report.created_by else None,
        "created_at": report.created_at,
        "updated_at": report.updated_at,
    }


def list_stored_reports(
    db: Session | None = None,
    *,
    category: str | None = None,
    severity: str | None = None,
    status: str | None = None,
    statuses: tuple[str, ...] | None = None,
    categories: tuple[str, ...] | None = None,
    neighborhood_slug: str | None = None,
    search: str | None = None,
    created_by_email: str | None = None,
    limit: int | None = None,
    offset: int = 0,
) -> list[dict[str, Any]]:
    """Read reports newest-first.

    In database mode every filter is pushed into SQL so a large municipal backlog is
    never pulled into the API process just to be filtered in Python.
    """
    if settings.operational_persistence_backend == "database":
        if db is None:
            raise RuntimeError("A database session is required for report persistence")
        statement = (
            select(IssueReport)
            .options(joinedload(IssueReport.neighborhood), joinedload(IssueReport.created_by))
            .order_by(IssueReport.created_at.desc(), IssueReport.id.desc())
        )
        if category:
            statement = statement.where(IssueReport.category == category)
        if severity:
            statement = statement.where(IssueReport.severity == severity)
        if status:
            statement = statement.where(IssueReport.status == status)
        if statuses:
            statement = statement.where(IssueReport.status.in_(statuses))
        if categories:
            statement = statement.where(IssueReport.category.in_(categories))
        if neighborhood_slug:
            statement = statement.join(Neighborhood).where(Neighborhood.slug == neighborhood_slug)
        if created_by_email:
            statement = statement.join(User, IssueReport.created_by_id == User.id).where(
                User.email == created_by_email
            )
        if search:
            needle = f"%{_escape_like(search)}%"
            statement = statement.where(
                or_(
                    IssueReport.title.ilike(needle, escape="\\"),
                    IssueReport.description.ilike(needle, escape="\\"),
                )
            )
        if offset:
            statement = statement.offset(offset)
        if limit is not None:
            statement = statement.limit(limit)
        return [_database_report_to_dict(report) for report in db.scalars(statement).all()]

    with _store_lock:
        reports = deepcopy(_store())
    # Same order as the database path: newest first, then highest id.
    reports.sort(key=lambda item: (item["created_at"], _report_number(str(item["id"]))), reverse=True)
    if statuses:
        reports = [report for report in reports if report["status"] in statuses]
    if categories:
        reports = [report for report in reports if report["category"] in categories]
    reports = _filter_reports(
        reports,
        category=category,
        severity=severity,
        status=status,
        neighborhood_slug=neighborhood_slug,
    )
    if created_by_email:
        reports = [report for report in reports if report.get("created_by_email") == created_by_email]
    if search:
        needle = search.lower()
        reports = [
            report
            for report in reports
            if needle in report["title"].lower() or needle in report["description"].lower()
        ]
    if offset:
        reports = reports[offset:]
    if limit is not None:
        reports = reports[:limit]
    return reports


def _report_number(report_id: str) -> int:
    try:
        return int(report_id.rsplit("-", 1)[-1])
    except ValueError:
        return 0


def _escape_like(value: str) -> str:
    """Neutralise LIKE wildcards so a search term cannot turn into a table scan pattern."""
    return value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


def get_stored_report(report_id: str, db: Session | None = None) -> dict[str, Any]:
    if settings.operational_persistence_backend == "database":
        if db is None:
            raise RuntimeError("A database session is required for report persistence")
        report = db.scalar(
            select(IssueReport)
            .options(joinedload(IssueReport.neighborhood), joinedload(IssueReport.created_by))
            .where(IssueReport.id == _database_report_id(report_id))
        )
        if report:
            return _database_report_to_dict(report)
        raise HTTPException(status_code=404, detail="Report not found")
    with _store_lock:
        for report in _store():
            if report["id"] == report_id:
                return deepcopy(report)
    raise HTTPException(status_code=404, detail="Report not found")


def set_stored_report_status(
    report_id: str, status: str, db: Session | None = None
) -> tuple[dict[str, Any], bool]:
    """Apply a status transition and return (report, changed).

    The change is flushed, not committed: the caller commits it together with its
    audit event, so a status change can never persist without its audit record. In
    database mode the row is locked, so two concurrent transitions (e.g. resolve and
    reject) are serialised and the second is validated against the first.
    """
    if settings.operational_persistence_backend == "database":
        if db is None:
            raise RuntimeError("A database session is required for report persistence")
        report = db.scalar(
            select(IssueReport)
            .where(IssueReport.id == _database_report_id(report_id))
            .with_for_update()
        )
        if report is None:
            raise HTTPException(status_code=404, detail="Report not found")
        if report.status == status:
            return _database_report_to_dict(report), False
        _validate_status_transition(report.status, status)
        report.status = status
        report.resolved_at = _now() if status == "resolved" else None
        report.updated_at = _now()
        db.flush()
        return _database_report_to_dict(report), True
    with _store_lock:
        for report in _store():
            if report["id"] == report_id:
                if report["status"] == status:
                    return deepcopy(report), False
                _validate_status_transition(str(report["status"]), status)
                report["status"] = status
                report["updated_at"] = _now()
                return deepcopy(report), True
    raise HTTPException(status_code=404, detail="Report not found")


def _validate_status_transition(current_status: str, next_status: str) -> None:
    if current_status == next_status:
        return
    if next_status not in REPORT_STATUS_TRANSITIONS.get(current_status, set()):
        raise HTTPException(
            status_code=409,
            detail=f"Report status cannot transition from {current_status} to {next_status}",
        )


def _filter_reports(
    reports: list[dict[str, Any]],
    *,
    category: str | None = None,
    severity: str | None = None,
    status: str | None = None,
    neighborhood_slug: str | None = None,
) -> list[dict[str, Any]]:
    if category:
        reports = [report for report in reports if report["category"] == category]
    if severity:
        reports = [report for report in reports if report["severity"] == severity]
    if status:
        reports = [report for report in reports if report["status"] == status]
    if neighborhood_slug:
        reports = [report for report in reports if report["neighborhood_slug"] == neighborhood_slug]
    return reports


def _public_report(report: dict[str, Any]) -> PublicReportRead:
    sensitive = report["category"] in SENSITIVE_CATEGORIES
    created_at = report["created_at"]
    if sensitive:
        # Day precision only: an exact timestamp plus neighbourhood can identify who
        # called about a medical or security incident.
        created_at = created_at.replace(hour=0, minute=0, second=0, microsecond=0)
    # Unreviewed citizen text is never published verbatim (names, phone numbers or
    # abuse typed into a title would otherwise go straight onto the public map).
    publish_title = not sensitive and report["status"] in PUBLIC_TITLE_STATUSES
    return PublicReportRead(
        id=report["id"],
        title=report["title"] if publish_title else "بلاغ قيد المراجعة",
        category=report["category"],
        severity=report["severity"],
        status=report["status"],
        neighborhood=report["neighborhood"],
        neighborhood_slug=report["neighborhood_slug"],
        approximate_latitude=None if sensitive or report.get("latitude") is None else round(float(report["latitude"]), 3),
        approximate_longitude=None if sensitive or report.get("longitude") is None else round(float(report["longitude"]), 3),
        created_at=created_at,
    )


def _serialize_for(report: dict[str, Any], user: dict[str, Any]) -> ReportRead:
    """Serialise a report for its viewer.

    Duplicate candidates are ids of *other* people's reports near a point. For a
    sensitive category they would reveal where hidden medical/security/fire reports
    are, so only municipality roles see them.
    """
    serialized = _serialize(report)
    if user["role"] not in REPORT_INTERNAL_VIEW_ROLES and report["category"] in SENSITIVE_CATEGORIES:
        serialized.duplicate_candidates = []
        serialized.duplicate_group_id = None
    return serialized


def _reject_control_characters(value: str | None, field: str) -> None:
    if value is not None and contains_control_characters(value):
        raise HTTPException(status_code=422, detail=f"{field} contains control characters")


@router.get("", response_model=list[ReportRead])
def list_reports(
    category: ReportCategory | None = None,
    severity: ReportSeverity | None = None,
    status: ReportStatus | None = None,
    neighborhood_slug: str | None = Query(default=None, max_length=120),
    search: str | None = Query(default=None, max_length=120),
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0, le=100_000),
    _: dict[str, Any] = Depends(require_roles(*REPORT_INTERNAL_VIEW_ROLES)),
    db: Session = Depends(get_db),
) -> list[ReportRead]:
    _reject_control_characters(search, "search")
    _reject_control_characters(neighborhood_slug, "neighborhood_slug")
    reports = list_stored_reports(
        db,
        category=category,
        severity=severity,
        status=status,
        neighborhood_slug=neighborhood_slug,
        search=search,
        limit=min(limit, settings.reports_page_size_max),
        offset=offset,
    )
    return [_serialize(report) for report in reports]


@router.get("/mine", response_model=list[ReportRead])
def list_my_reports(
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0, le=100_000),
    user: dict[str, Any] = Depends(current_user),
    db: Session = Depends(get_db),
) -> list[ReportRead]:
    reports = list_stored_reports(db, created_by_email=user["email"], limit=limit, offset=offset)
    return [_serialize_for(report, user) for report in reports]


@router.get("/public", response_model=list[PublicReportRead])
def list_public_reports(
    request: Request,
    limit: int = Query(default=100, ge=1, le=200),
    offset: int = Query(default=0, ge=0, le=100_000),
    db: Session = Depends(get_db),
) -> list[PublicReportRead]:
    enforce_rate_limit(
        request,
        db,
        scope="reports.public",
        limit=settings.public_read_max_attempts,
        window_seconds=settings.public_query_window_seconds,
    )
    reports = list_stored_reports(db, statuses=PUBLIC_FEED_STATUSES, limit=limit, offset=offset)
    return [_public_report(report) for report in reports]


@router.post("", response_model=ReportRead, status_code=201)
def create_report(
    payload: ReportCreate,
    request: Request,
    user: dict[str, Any] = Depends(current_user),
    db: Session = Depends(get_db),
) -> ReportRead:
    enforce_rate_limit(
        request,
        db,
        scope="reports.create",
        identity=user["email"],
        limit=settings.report_create_max_attempts,
        window_seconds=settings.public_query_window_seconds,
    )
    if payload.image_upload_status == "stored":
        raise HTTPException(status_code=503, detail="Durable report image storage is not configured")

    duplicates = (
        _duplicate_candidates(
            category=payload.category,
            neighborhood_slug=payload.neighborhood_slug,
            latitude=payload.latitude,
            longitude=payload.longitude,
            db=db,
        )
        if payload.neighborhood_slug and payload.latitude is not None and payload.longitude is not None
        else []
    )
    image_analysis = _analysis_for_category(payload.category)
    persisted_image_url = payload.image_url if payload.image_upload_status == "stored" else None

    if settings.operational_persistence_backend == "database":
        neighborhood = (
            db.scalar(select(Neighborhood).where(Neighborhood.slug == payload.neighborhood_slug))
            if payload.neighborhood_slug
            else None
        )
        if payload.neighborhood_slug and neighborhood is None:
            raise HTTPException(status_code=422, detail=f"Unknown Tripoli neighborhood: {payload.neighborhood_slug}")
        creator = db.scalar(select(User).where(User.email == user["email"]))
        if creator is None:
            raise HTTPException(status_code=401, detail="Authenticated user is unavailable")
        report_model = IssueReport(
            title=payload.title,
            description=payload.description,
            category=payload.category,
            severity=payload.severity,
            status="submitted",
            source="citizen" if user["role"] == "citizen" else "municipality",
            latitude=payload.latitude,
            longitude=payload.longitude,
            location=(
                WKTElement(f"POINT({payload.longitude} {payload.latitude})", srid=4326)
                if payload.latitude is not None and payload.longitude is not None
                else None
            ),
            manual_location=payload.manual_location,
            location_source=payload.location_source,
            image_url=persisted_image_url,
            image_upload_status=payload.image_upload_status,
            image_metadata=payload.image_metadata.model_dump() if payload.image_metadata else {},
            analysis_status=image_analysis.status,
            image_analysis=image_analysis.model_dump(mode="json"),
            duplicate_group_id=f"duplicate:{duplicates[0]}" if duplicates else None,
            duplicate_candidates=duplicates,
            neighborhood=neighborhood,
            created_by=creator,
        )
        db.add(report_model)
        db.flush()
        report = _database_report_to_dict(report_model)
        record_audit_event(
            db,
            request,
            action="report.created",
            resource_type="report",
            actor_email=user["email"],
            resource_id=report["id"],
            details={"category": payload.category, "location_source": payload.location_source},
        )
        db.commit()
        return _serialize_for(report, user)

    with _store_lock:
        reports = _store()
        neighborhood_name = _slug_to_name(payload.neighborhood_slug) if payload.neighborhood_slug else "موقع يدوي في طرابلس"
        next_report_number = max(int(str(item["id"]).split("-")[-1]) for item in reports) + 1
        created_at = _now()
        report = {
            "id": f"TRP-{next_report_number}",
            "title": payload.title,
            "description": payload.description,
            "category": payload.category,
            "severity": payload.severity,
            "status": "submitted",
            "neighborhood": neighborhood_name,
            "neighborhood_slug": payload.neighborhood_slug,
            "latitude": payload.latitude,
            "longitude": payload.longitude,
            "manual_location": payload.manual_location,
            "location_source": payload.location_source,
            "image_url": persisted_image_url,
            "image_upload_status": payload.image_upload_status,
            "image_metadata": payload.image_metadata.model_dump() if payload.image_metadata else None,
            "analysis_status": image_analysis.status,
            "image_analysis": image_analysis.model_dump(),
            "duplicate_group_id": f"duplicate:{duplicates[0]}" if duplicates else None,
            "duplicate_candidates": duplicates,
            "created_by_email": user["email"],
            "created_at": created_at,
            "updated_at": created_at,
        }
        reports.insert(0, report)
        record_audit_event(
            db,
            request,
            action="report.created",
            resource_type="report",
            actor_email=user["email"],
            resource_id=report["id"],
            details={"category": payload.category, "location_source": payload.location_source},
        )
        return _serialize_for(report, user)


@router.get("/{report_id}", response_model=ReportRead)
def get_report(
    report_id: str,
    user: dict[str, Any] = Depends(current_user),
    db: Session = Depends(get_db),
) -> ReportRead:
    report = get_stored_report(report_id, db)
    owns_report = report.get("created_by_email") == user["email"]
    if user["role"] not in REPORT_INTERNAL_VIEW_ROLES and not owns_report:
        raise HTTPException(status_code=403, detail="Report details are limited to the reporter and municipality roles")
    return _serialize_for(report, user)


@router.patch("/{report_id}/status", response_model=ReportRead)
def update_report_status(
    report_id: str,
    payload: ReportStatusUpdate,
    request: Request,
    user: dict[str, Any] = Depends(require_roles(*REPORT_STATUS_ROLES)),
    db: Session = Depends(get_db),
) -> ReportRead:
    report, changed = set_stored_report_status(report_id, payload.status, db)
    if changed:
        record_audit_event(
            db,
            request,
            action="report.status_updated",
            resource_type="report",
            actor_email=user["email"],
            # Canonical id, never the raw path value (1005, TRP-01005, ...).
            resource_id=report["id"],
            details={"status": payload.status},
        )
    db.commit()
    return _serialize(report)


@router.post("/suggest-category", response_model=ReportCategorySuggestion)
def suggest_category(
    payload: ReportCreate,
    request: Request,
    user: dict[str, Any] = Depends(current_user),
    db: Session = Depends(get_db),
) -> ReportCategorySuggestion:
    enforce_rate_limit(
        request,
        db,
        scope="reports.suggest_category",
        identity=user["email"],
        limit=settings.assistant_query_max_attempts,
        window_seconds=settings.public_query_window_seconds,
    )
    category, confidence, rationale = _suggest_category(payload.title, payload.description)
    duplicates = _duplicate_candidates(
        category=category,
        neighborhood_slug=payload.neighborhood_slug,
        latitude=payload.latitude,
        longitude=payload.longitude,
        db=db,
    ) if payload.neighborhood_slug and payload.latitude is not None and payload.longitude is not None else []
    if user["role"] not in REPORT_INTERNAL_VIEW_ROLES and category in SENSITIVE_CATEGORIES:
        # Otherwise any account could probe coordinates to locate hidden reports.
        duplicates = []
    return ReportCategorySuggestion(
        category=category,
        confidence=confidence,
        rationale=rationale,
        duplicate_candidates=duplicates,
    )

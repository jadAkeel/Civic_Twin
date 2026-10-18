from __future__ import annotations

from copy import deepcopy
from datetime import UTC, datetime
from threading import RLock
from typing import Any, Literal

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel, Field
from sqlalchemy import and_, case, func, select, true
from sqlalchemy.orm import Session, joinedload

from app.core.audit import record_audit_event
from app.core.config import settings
from app.core.seed import load_seed
from app.db.session import get_db
from app.models.city_asset import CityAsset
from app.models.issue_report import IssueReport
from app.models.neighborhood import Neighborhood
from app.models.user import User
from app.modules.auth.router import (
    FULL_NAME_MAX_LENGTH,
    ROLES,
    current_user,
    list_users,
    normalize_email,
    require_roles,
    upsert_user_record,
)
from app.modules.predictions.engine import build_predictions
from app.modules.predictions.router import build_current_predictions
from app.modules.reports.router import get_stored_report, list_stored_reports, set_stored_report_status
from app.schemas.reports import ReportRead
from app.modules.scenarios.repository import list_database_results, list_memory_results
from app.services.city_data import load_city_snapshot

router = APIRouter(prefix="/admin", tags=["admin"])
ADMIN_ROLES = ("owner", "municipality_admin", "decision_maker", "analyst", "police", "red_cross", "civil_defense")
MUNICIPALITY_ROLES = ("owner", "municipality_admin", "decision_maker", "analyst")
OWNER_ROLES = ("owner",)
AGENCY_CATEGORY_RULES = {
    "police": ("security_incident",),
    "red_cross": ("medical_emergency",),
    "civil_defense": ("fire_hazard",),
}
AGENCY_LABELS = {
    "owner": "بوابة البلدية",
    "municipality_admin": "بوابة البلدية",
    "decision_maker": "بوابة البلدية",
    "analyst": "بوابة البلدية",
    "police": "بوابة الشرطة",
    "red_cross": "بوابة الصليب الأحمر اللبناني",
    "civil_defense": "بوابة الدفاع المدني / الحريق",
}
_assets: list[dict[str, Any]] | None = None
_assets_lock = RLock()


class ReportStatusUpdate(BaseModel):
    status: Literal["submitted", "validated", "in_progress", "resolved", "rejected", "duplicate"]


class AssetStatusUpdate(BaseModel):
    status: Literal["active", "needs_maintenance", "inactive", "planned"]


class UserUpsert(BaseModel):
    full_name: str = Field(min_length=2, max_length=FULL_NAME_MAX_LENGTH)
    email: str = Field(min_length=5, max_length=255)
    role: str
    password: str | None = Field(default=None, min_length=8, max_length=128)
    is_active: bool = True


def _load_seed() -> dict[str, Any]:
    return load_seed()


def _asset_store() -> list[dict[str, Any]]:
    global _assets
    with _assets_lock:
        if _assets is None:
            _assets = [{"id": f"asset-{index}", **asset} for index, asset in enumerate(_load_seed()["city_assets"], start=1)]
        return _assets


def reset_admin_assets_for_tests() -> None:
    global _assets
    with _assets_lock:
        _assets = None


def _visible_categories(role: str) -> tuple[str, ...] | None:
    return AGENCY_CATEGORY_RULES.get(role)


def _is_report_visible(report: dict[str, Any], user: dict[str, str]) -> bool:
    categories = _visible_categories(user["role"])
    return categories is None or report["category"] in categories


def _visible_reports_for_db(
    user: dict[str, str],
    db: Session,
    *,
    limit: int | None = None,
    offset: int = 0,
) -> list[dict[str, Any]]:
    """Agency portals only ever see their own categories; the filter runs in SQL."""
    categories = _visible_categories(user["role"])
    # One query with IN (...) so limit/offset page through the agency's reports as a
    # whole rather than per category.
    return list_stored_reports(db, categories=categories, limit=limit, offset=offset)


def _find_report(report_id: str, db: Session) -> dict[str, Any]:
    return get_stored_report(report_id, db)


def _serialize_asset(asset: CityAsset, latitude: float | None, longitude: float | None) -> dict[str, Any]:
    return {
        "id": f"asset-{asset.id}",
        "name": asset.name,
        "asset_type": asset.asset_type,
        "status": asset.status,
        "neighborhood_slug": asset.neighborhood.slug if asset.neighborhood else None,
        "location": (
            {"latitude": float(latitude), "longitude": float(longitude)}
            if latitude is not None and longitude is not None
            else None
        ),
        "metadata_json": deepcopy(asset.metadata_json),
    }


def _list_assets(db: Session) -> list[dict[str, Any]]:
    if settings.operational_persistence_backend != "database":
        with _assets_lock:
            return deepcopy(_asset_store())
    rows = db.execute(
        select(CityAsset, func.ST_Y(CityAsset.location), func.ST_X(CityAsset.location))
        .options(joinedload(CityAsset.neighborhood))
        .order_by(CityAsset.id)
    ).all()
    return [_serialize_asset(asset, latitude, longitude) for asset, latitude, longitude in rows]


def _hotspots(reports: list[dict[str, Any]]) -> list[dict[str, Any]]:
    grouped: dict[tuple[str, str], dict[str, Any]] = {}
    for report in reports:
        # Manually located reports have no neighbourhood; the SQL path drops them
        # through its inner join, so they must not form a "None" hotspot here.
        if not report.get("neighborhood_slug"):
            continue
        key = (str(report["neighborhood_slug"]), str(report["category"]))
        item = grouped.setdefault(
            key,
            {
                "name": report["neighborhood"],
                "slug": report["neighborhood_slug"],
                "category": report["category"],
                "total_reports": 0,
                "open_reports": 0,
                "critical_reports": 0,
                "priority_score": 0,
            },
        )
        item["total_reports"] += 1
        if report["status"] in {"submitted", "validated", "in_progress"}:
            item["open_reports"] += 1
        if report["severity"] == "critical":
            item["critical_reports"] += 1
        item["priority_score"] += 10
        if report["severity"] == "critical":
            item["priority_score"] += 5
        elif report["severity"] == "high":
            item["priority_score"] += 3

    return sorted(
        grouped.values(), key=lambda item: (-item["priority_score"], str(item["slug"]), str(item["category"]))
    )[:4]


OPEN_REPORT_STATUSES = ("submitted", "validated", "in_progress")


def _database_overview_stats(
    db: Session, categories: tuple[str, ...] | None, *, since: datetime | None = None
) -> dict[str, Any]:
    """Totals and hotspots via GROUP BY, scoped to the agency's categories in SQL."""
    is_open = case((IssueReport.status.in_(OPEN_REPORT_STATUSES), 1), else_=0)
    is_critical = case((IssueReport.severity == "critical", 1), else_=0)
    is_high = case((IssueReport.severity == "high", 1), else_=0)
    scope = IssueReport.category.in_(categories) if categories else true()
    if since is not None:
        scope = and_(scope, IssueReport.created_at >= since)

    total, open_count, critical = db.execute(
        select(
            func.count(IssueReport.id),
            func.coalesce(func.sum(is_open), 0),
            func.coalesce(func.sum(is_critical), 0),
        ).where(scope)
    ).one()

    hotspot_rows = db.execute(
        select(
            Neighborhood.name,
            Neighborhood.slug,
            IssueReport.category,
            func.count(IssueReport.id),
            func.coalesce(func.sum(is_open), 0),
            func.coalesce(func.sum(is_critical), 0),
            func.coalesce(func.sum(is_high), 0),
        )
        .join(Neighborhood, Neighborhood.id == IssueReport.neighborhood_id)
        .where(scope)
        .group_by(Neighborhood.name, Neighborhood.slug, IssueReport.category)
        # Deterministic order for equal counts, identical in both persistence modes.
        .order_by(Neighborhood.slug, IssueReport.category)
    ).all()
    hotspots = [
        {
            "name": name,
            "slug": slug,
            "category": category,
            "total_reports": int(count),
            "open_reports": int(open_reports),
            "critical_reports": int(critical_reports),
            # Same weighting as the in-memory path: 10 per report, +5 critical, +3 high.
            "priority_score": int(count) * 10 + int(critical_reports) * 5 + int(high_reports) * 3,
        }
        for name, slug, category, count, open_reports, critical_reports, high_reports in hotspot_rows
    ]
    hotspots.sort(key=lambda item: (-item["priority_score"], str(item["slug"]), str(item["category"])))
    return {
        "total": int(total),
        "open": int(open_count),
        "critical": int(critical),
        "hotspots": hotspots[:4],
    }


def _memory_overview_stats(reports: list[dict[str, Any]]) -> dict[str, Any]:
    return {
        "total": len(reports),
        "open": sum(1 for report in reports if report["status"] in OPEN_REPORT_STATUSES),
        "critical": sum(1 for report in reports if report["severity"] == "critical"),
        "hotspots": _hotspots(reports),
    }


@router.get("/overview")
def overview(
    user: dict[str, str] = Depends(require_roles(*ADMIN_ROLES)),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    categories = _visible_categories(user["role"])
    month_start = datetime.now(UTC).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    if settings.operational_persistence_backend == "database":
        stats = _database_overview_stats(db, categories)
        monthly = _database_overview_stats(db, categories, since=month_start)
    else:
        visible = _visible_reports_for_db(user, db)
        stats = _memory_overview_stats(visible)
        monthly = _memory_overview_stats([report for report in visible if report["created_at"] >= month_start])
    assets_total = len(_list_assets(db)) if user["role"] in MUNICIPALITY_ROLES else 0
    # Reads open reports only (see load_city_snapshot), so this stays bounded.
    city_snapshot = load_city_snapshot(db)
    return {
        "portal_name": AGENCY_LABELS[user["role"]],
        "role": user["role"],
        "visible_categories": list(categories) if categories else ["all"],
        "visibility_note": "مفلتر حسب صلاحية الجهة" if categories else "صلاحيات البلدية يمكنها رؤية كل البلاغات",
        "notification_provider_status": "not_configured",
        "official_gis_status": "not_configured",
        "reports_total": stats["total"],
        "assets_total": assets_total,
        "open_reports": stats["open"],
        "pending_scenarios": sum(1 for scenario in city_snapshot["scenarios"] if scenario["status"] == "draft"),
        # Reuse the snapshot already loaded above instead of reading it a second time.
        "active_predictions": len(build_predictions(city_snapshot)),
        # Reports filed this calendar month (UTC); the headline totals are all-time.
        "monthly_summary": {
            "month": month_start.strftime("%Y-%m"),
            "total_reports": monthly["total"],
            "open_reports": monthly["open"],
            "critical_reports": monthly["critical"],
            "source": city_snapshot["metadata"].get("source", "city_snapshot"),
        },
        "hotspots": stats["hotspots"],
    }


@router.get("/reports", response_model=list[ReportRead])
def reports(
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0, le=100_000),
    user: dict[str, str] = Depends(require_roles(*ADMIN_ROLES)),
    db: Session = Depends(get_db),
) -> list[dict[str, Any]]:
    # response_model strips the reporter's email: agencies get the location and
    # details they need to respond, not the resident's account identity.
    return _visible_reports_for_db(user, db, limit=limit, offset=offset)


@router.get("/reports/{report_id}", response_model=ReportRead)
def report_detail(
    report_id: str,
    user: dict[str, str] = Depends(require_roles(*ADMIN_ROLES)),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    report = _find_report(report_id, db)
    if not _is_report_visible(report, user):
        raise HTTPException(status_code=403, detail="Report is outside this agency portal")
    return report


@router.patch("/reports/{report_id}/status", response_model=ReportRead)
def update_report_status(
    report_id: str,
    payload: ReportStatusUpdate,
    request: Request,
    user: dict[str, str] = Depends(require_roles(*ADMIN_ROLES)),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    report = _find_report(report_id, db)
    if not _is_report_visible(report, user):
        raise HTTPException(status_code=403, detail="Report is outside this agency portal")
    updated, changed = set_stored_report_status(report_id, payload.status, db)
    if changed:
        record_audit_event(
            db,
            request,
            action="report.status_changed",
            resource_type="issue_report",
            actor_email=user["email"],
            resource_id=updated["id"],
            details={"previous_status": report["status"], "status": payload.status},
        )
    db.commit()
    return updated


@router.get("/assets")
def assets(
    user: dict[str, str] = Depends(current_user),
    db: Session = Depends(get_db),
) -> list[dict[str, Any]]:
    if user["role"] not in MUNICIPALITY_ROLES:
        raise HTTPException(status_code=403, detail="City assets are limited to municipality roles")
    return _list_assets(db)


@router.patch("/assets/{asset_id}/status")
def update_asset_status(
    asset_id: str,
    payload: AssetStatusUpdate,
    request: Request,
    user: dict[str, str] = Depends(require_roles(*MUNICIPALITY_ROLES)),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    if settings.operational_persistence_backend == "database":
        try:
            numeric_id = int(asset_id.removeprefix("asset-"))
        except ValueError as exc:
            raise HTTPException(status_code=404, detail="Asset not found") from exc
        if numeric_id < 1 or numeric_id > 2_147_483_647:  # beyond INTEGER: PostgreSQL would 500
            raise HTTPException(status_code=404, detail="Asset not found")
        asset = db.scalar(select(CityAsset).options(joinedload(CityAsset.neighborhood)).where(CityAsset.id == numeric_id))
        if asset is None:
            raise HTTPException(status_code=404, detail="Asset not found")
        previous_status = asset.status
        asset.status = payload.status
        record_audit_event(
            db,
            request,
            action="asset.status_changed",
            resource_type="city_asset",
            actor_email=user["email"],
            resource_id=f"asset-{numeric_id}",
            details={"previous_status": previous_status, "status": payload.status},
        )
        db.commit()
        row = db.execute(
            select(CityAsset, func.ST_Y(CityAsset.location), func.ST_X(CityAsset.location)).where(CityAsset.id == numeric_id)
        ).one()
        return _serialize_asset(*row)
    with _assets_lock:
        for asset in _asset_store():
            if asset["id"] == asset_id:
                previous_status = asset["status"]
                asset["status"] = payload.status
                updated = deepcopy(asset)
                break
        else:
            raise HTTPException(status_code=404, detail="Asset not found")
    record_audit_event(
        db,
        request,
        action="asset.status_changed",
        resource_type="city_asset",
        actor_email=user["email"],
        resource_id=asset_id,
        details={"previous_status": previous_status, "status": payload.status},
    )
    db.commit()
    return updated


@router.get("/review")
def review(
    _: dict[str, str] = Depends(require_roles(*MUNICIPALITY_ROLES)),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    scenario_results = (
        list_database_results(db, settings.scenario_history_limit)
        if settings.scenario_persistence_backend == "database"
        else list_memory_results(settings.scenario_history_limit)
    )
    return {
        "scenarios": load_city_snapshot(db, include_reports=False)["scenarios"],
        "scenario_results": scenario_results,
        "predictions": build_current_predictions(db),
    }


def _guard_last_owner(db: Session, payload: "UserUpsert", *, actor_email: str) -> None:
    """Refuse an edit that would leave CityMind with no active owner.

    The email is normalised exactly like upsert_user_record does (control characters
    stripped), and in database mode the owner rows stay locked until the caller
    commits, so two owners demoting each other concurrently cannot both pass.
    """
    target_email = normalize_email(payload.email)
    still_owner = payload.role == "owner" and payload.is_active
    if still_owner:
        return

    if settings.operational_persistence_backend == "database":
        owners = list(
            db.scalars(
                select(User.email).where(User.role == "owner", User.is_active.is_(True)).with_for_update()
            ).all()
        )
    else:
        owners = [
            entry["email"]
            for entry in list_users(db)
            if entry["role"] == "owner" and entry["is_active"]
        ]
    if target_email in owners and len(owners) <= 1:
        detail = (
            "You are the only active owner. Promote another owner before changing your own role or status."
            if target_email == normalize_email(actor_email)
            else "CityMind must keep at least one active owner."
        )
        raise HTTPException(status_code=409, detail=detail)


@router.get("/users")
def users(
    _: dict[str, str] = Depends(require_roles(*OWNER_ROLES)),
    db: Session = Depends(get_db),
) -> list[dict[str, Any]]:
    return list_users(db)


@router.post("/users")
def upsert_user(
    payload: UserUpsert,
    request: Request,
    user: dict[str, str] = Depends(require_roles(*OWNER_ROLES)),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    if payload.role not in ROLES:
        raise HTTPException(status_code=422, detail="Unsupported CityMind role")
    _guard_last_owner(db, payload, actor_email=user["email"])
    stored = upsert_user_record(
        db,
        email=payload.email,
        full_name=payload.full_name,
        role=payload.role,
        is_active=payload.is_active,
        password=payload.password,
    )
    record_audit_event(
        db,
        request,
        action="user.upserted",
        resource_type="user",
        actor_email=user["email"],
        resource_id=stored["email"],
        details={"role": stored["role"], "is_active": stored["is_active"]},
    )
    db.commit()
    return stored

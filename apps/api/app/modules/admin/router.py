from __future__ import annotations

from copy import deepcopy
from datetime import UTC, datetime
from threading import RLock
from typing import Any, Literal

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload

from app.core.audit import record_audit_event
from app.core.config import settings
from app.core.seed import load_seed
from app.db.session import get_db
from app.models.city_asset import CityAsset
from app.modules.auth.router import ROLES, current_user, list_users, require_roles, upsert_user_record
from app.modules.predictions.router import build_current_predictions
from app.modules.reports.router import get_stored_report, list_stored_reports, set_stored_report_status
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
    full_name: str = Field(min_length=2, max_length=255)
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


def _visible_reports_for_db(user: dict[str, str], db: Session) -> list[dict[str, Any]]:
    return [report for report in list_stored_reports(db) if _is_report_visible(report, user)]


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

    return sorted(grouped.values(), key=lambda item: item["priority_score"], reverse=True)[:4]


@router.get("/overview")
def overview(
    user: dict[str, str] = Depends(require_roles(*ADMIN_ROLES)),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    reports = _visible_reports_for_db(user, db)
    assets = _list_assets(db)
    city_snapshot = load_city_snapshot(db)
    categories = _visible_categories(user["role"])
    return {
        "portal_name": AGENCY_LABELS[user["role"]],
        "role": user["role"],
        "visible_categories": list(categories) if categories else ["all"],
        "visibility_note": "مفلتر حسب صلاحية الجهة" if categories else "صلاحيات البلدية يمكنها رؤية كل البلاغات التجريبية",
        "notification_provider_status": "not_configured",
        "official_gis_status": "not_configured",
        "reports_total": len(reports),
        "assets_total": len(assets) if user["role"] in MUNICIPALITY_ROLES else 0,
        "open_reports": sum(1 for report in reports if report["status"] in {"submitted", "validated", "in_progress"}),
        "pending_scenarios": sum(1 for scenario in city_snapshot["scenarios"] if scenario["status"] == "draft"),
        "active_predictions": len(build_current_predictions(db)),
        "monthly_summary": {
            "month": datetime.now(UTC).strftime("%Y-%m"),
            "total_reports": len(reports),
            "open_reports": sum(1 for report in reports if report["status"] in {"submitted", "validated", "in_progress"}),
            "critical_reports": sum(1 for report in reports if report["severity"] == "critical"),
            "source": city_snapshot["metadata"].get("source", "city_snapshot"),
        },
        "hotspots": _hotspots(reports),
    }


@router.get("/reports")
def reports(
    user: dict[str, str] = Depends(require_roles(*ADMIN_ROLES)),
    db: Session = Depends(get_db),
) -> list[dict[str, Any]]:
    return _visible_reports_for_db(user, db)


@router.get("/reports/{report_id}")
def report_detail(
    report_id: str,
    user: dict[str, str] = Depends(require_roles(*ADMIN_ROLES)),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    report = _find_report(report_id, db)
    if not _is_report_visible(report, user):
        raise HTTPException(status_code=403, detail="Report is outside this agency portal")
    return report


@router.patch("/reports/{report_id}/status")
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
    updated = set_stored_report_status(report_id, payload.status, db)
    record_audit_event(
        db,
        request,
        action="report.status_changed",
        resource_type="issue_report",
        actor_email=user["email"],
        resource_id=report_id,
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
            resource_id=asset_id,
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
        "scenarios": load_city_snapshot(db)["scenarios"],
        "scenario_results": scenario_results,
        "predictions": build_current_predictions(db),
    }


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

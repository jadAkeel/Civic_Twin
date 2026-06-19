from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.core.seed import load_seed
from app.modules.auth.router import ROLES, current_user, list_local_users, require_roles, upsert_local_user
from app.modules.predictions.router import list_predictions
from app.modules.reports.router import _store
from app.modules.scenarios.router import list_results, list_scenarios

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


class StatusUpdate(BaseModel):
    status: str


class UserUpsert(BaseModel):
    full_name: str
    email: str
    role: str
    password: str | None = None
    is_active: bool = True


def _load_seed() -> dict[str, Any]:
    return load_seed()


def _asset_store() -> list[dict[str, Any]]:
    global _assets
    if _assets is None:
        _assets = [{"id": f"asset-{index}", **asset} for index, asset in enumerate(_load_seed()["city_assets"], start=1)]
    return _assets


def reset_admin_assets_for_tests() -> None:
    global _assets
    _assets = None


def _visible_categories(role: str) -> tuple[str, ...] | None:
    return AGENCY_CATEGORY_RULES.get(role)


def _is_report_visible(report: dict[str, Any], user: dict[str, str]) -> bool:
    categories = _visible_categories(user["role"])
    return categories is None or report["category"] in categories


def _visible_reports(user: dict[str, str]) -> list[dict[str, Any]]:
    return [report for report in _store() if _is_report_visible(report, user)]


def _find_report(report_id: str) -> dict[str, Any]:
    for report in _store():
        if report["id"] == report_id:
            return report
    raise HTTPException(status_code=404, detail="Report not found")


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
def overview(user: dict[str, str] = Depends(require_roles(*ADMIN_ROLES))) -> dict[str, Any]:
    reports = _visible_reports(user)
    assets = _asset_store()
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
        "pending_scenarios": len(list_scenarios()),
        "active_predictions": len(list_predictions()),
        "monthly_summary": {
            "month": "حزيران 2026",
            "total_reports": len(reports),
            "open_reports": sum(1 for report in reports if report["status"] in {"submitted", "validated", "in_progress"}),
            "critical_reports": sum(1 for report in reports if report["severity"] == "critical"),
            "source": "demo_seed",
        },
        "hotspots": _hotspots(reports),
    }


@router.get("/reports")
def reports(user: dict[str, str] = Depends(require_roles(*ADMIN_ROLES))) -> list[dict[str, Any]]:
    return _visible_reports(user)


@router.get("/reports/{report_id}")
def report_detail(report_id: str, user: dict[str, str] = Depends(require_roles(*ADMIN_ROLES))) -> dict[str, Any]:
    report = _find_report(report_id)
    if not _is_report_visible(report, user):
        raise HTTPException(status_code=403, detail="Report is outside this agency portal")
    return report


@router.patch("/reports/{report_id}/status")
def update_report_status(report_id: str, payload: StatusUpdate, user: dict[str, str] = Depends(require_roles(*ADMIN_ROLES))) -> dict[str, Any]:
    report = _find_report(report_id)
    if not _is_report_visible(report, user):
        raise HTTPException(status_code=403, detail="Report is outside this agency portal")
    report["status"] = payload.status
    return report


@router.get("/assets")
def assets(user: dict[str, str] = Depends(current_user)) -> list[dict[str, Any]]:
    if user["role"] not in MUNICIPALITY_ROLES:
        raise HTTPException(status_code=403, detail="City assets are limited to municipality roles")
    return _asset_store()


@router.patch("/assets/{asset_id}/status")
def update_asset_status(asset_id: str, payload: StatusUpdate, _: dict[str, str] = Depends(require_roles(*MUNICIPALITY_ROLES))) -> dict[str, Any]:
    for asset in _asset_store():
        if asset["id"] == asset_id:
            asset["status"] = payload.status
            return asset
    raise HTTPException(status_code=404, detail="Asset not found")


@router.get("/review")
def review(_: dict[str, str] = Depends(require_roles(*MUNICIPALITY_ROLES))) -> dict[str, Any]:
    return {
        "scenarios": list_scenarios(),
        "scenario_results": list_results(),
        "predictions": list_predictions(),
    }


@router.get("/users")
def users(_: dict[str, str] = Depends(require_roles(*OWNER_ROLES))) -> list[dict[str, Any]]:
    return list_local_users()


@router.post("/users")
def upsert_user(payload: UserUpsert, _: dict[str, str] = Depends(require_roles(*OWNER_ROLES))) -> dict[str, Any]:
    if payload.role not in ROLES:
        raise HTTPException(status_code=422, detail="Unsupported CityMind role")
    return upsert_local_user(
        email=payload.email,
        full_name=payload.full_name,
        role=payload.role,
        is_active=payload.is_active,
        password=payload.password,
    )

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.modules.auth.router import require_roles
from app.modules.predictions.router import list_predictions
from app.modules.reports.router import _store
from app.modules.scenarios.router import list_results, list_scenarios

router = APIRouter(prefix="/admin", tags=["admin"])
SEED_PATH = Path(__file__).resolve().parents[5] / "data" / "tripoli_seed.json"
ADMIN_ROLES = ("municipality_admin", "decision_maker")
_assets: list[dict[str, Any]] | None = None


class StatusUpdate(BaseModel):
    status: str


def _load_seed() -> dict[str, Any]:
    return json.loads(SEED_PATH.read_text(encoding="utf-8"))


def _asset_store() -> list[dict[str, Any]]:
    global _assets
    if _assets is None:
        _assets = [{"id": f"asset-{index}", **asset} for index, asset in enumerate(_load_seed()["city_assets"], start=1)]
    return _assets


def reset_admin_assets_for_tests() -> None:
    global _assets
    _assets = None


@router.get("/overview")
def overview(_: dict[str, str] = Depends(require_roles(*ADMIN_ROLES))) -> dict[str, Any]:
    reports = _store()
    assets = _asset_store()
    return {
        "reports_total": len(reports),
        "assets_total": len(assets),
        "open_reports": sum(1 for report in reports if report["status"] in {"submitted", "validated", "in_progress"}),
        "pending_scenarios": len(list_scenarios()),
        "active_predictions": len(list_predictions()),
    }


@router.get("/reports")
def reports(_: dict[str, str] = Depends(require_roles(*ADMIN_ROLES))) -> list[dict[str, Any]]:
    return _store()


@router.patch("/reports/{report_id}/status")
def update_report_status(report_id: str, payload: StatusUpdate, _: dict[str, str] = Depends(require_roles(*ADMIN_ROLES))) -> dict[str, Any]:
    for report in _store():
        if report["id"] == report_id:
            report["status"] = payload.status
            return report
    raise HTTPException(status_code=404, detail="Report not found")


@router.get("/assets")
def assets(_: dict[str, str] = Depends(require_roles(*ADMIN_ROLES))) -> list[dict[str, Any]]:
    return _asset_store()


@router.patch("/assets/{asset_id}/status")
def update_asset_status(asset_id: str, payload: StatusUpdate, _: dict[str, str] = Depends(require_roles(*ADMIN_ROLES))) -> dict[str, Any]:
    for asset in _asset_store():
        if asset["id"] == asset_id:
            asset["status"] = payload.status
            return asset
    raise HTTPException(status_code=404, detail="Asset not found")


@router.get("/review")
def review(_: dict[str, str] = Depends(require_roles(*ADMIN_ROLES))) -> dict[str, Any]:
    return {
        "scenarios": list_scenarios(),
        "scenario_results": list_results(),
        "predictions": list_predictions(),
    }

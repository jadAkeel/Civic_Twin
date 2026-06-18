from fastapi import APIRouter

from app.modules.analytics.report_aggregates import build_report_aggregates
from app.modules.reports.router import _store

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/summary")
def dashboard_summary() -> dict:
    return build_report_aggregates(_store())

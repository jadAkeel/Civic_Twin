from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import get_db
from app.modules.analytics.report_aggregates import (
    build_database_report_aggregates,
    build_report_aggregates,
)
from app.modules.auth.router import require_roles
from app.modules.reports.router import list_stored_reports
from app.schemas.reports import ReportRead

router = APIRouter(prefix="/dashboard", tags=["dashboard"])
RECENT_REPORT_LIMIT = 8


@router.get("/summary")
def dashboard_summary(
    _: dict = Depends(require_roles("owner", "municipality_admin", "decision_maker", "analyst")),
    db: Session = Depends(get_db),
) -> dict:
    if settings.operational_persistence_backend == "database":
        # Counted with GROUP BY; only the recent-report strip is materialised.
        recent = list_stored_reports(db, limit=RECENT_REPORT_LIMIT)
        summary = build_database_report_aggregates(db, recent)
    else:
        summary = build_report_aggregates(list_stored_reports(db))
    # Same public shape as /reports: never the reporter's email address.
    summary["recent_reports"] = [
        ReportRead(**report).model_dump(mode="json") for report in summary["recent_reports"]
    ]
    return summary

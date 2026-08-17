from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.modules.analytics.report_aggregates import build_report_aggregates
from app.modules.auth.router import require_roles
from app.modules.reports.router import list_stored_reports

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/summary")
def dashboard_summary(
    _: dict = Depends(require_roles("owner", "municipality_admin", "decision_maker", "analyst")),
    db: Session = Depends(get_db),
) -> dict:
    return build_report_aggregates(list_stored_reports(db))

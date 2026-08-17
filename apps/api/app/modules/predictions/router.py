from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.modules.auth.router import require_roles
from app.modules.predictions.engine import build_predictions
from app.services.city_data import load_city_snapshot

router = APIRouter(prefix="/predictions", tags=["predictions"])
PREDICTION_ROLES = ("owner", "municipality_admin", "decision_maker", "analyst")


def build_current_predictions(db: Session) -> list[dict[str, Any]]:
    return build_predictions(load_city_snapshot(db))


@router.get("")
def list_predictions(
    _: dict[str, Any] = Depends(require_roles(*PREDICTION_ROLES)),
    db: Session = Depends(get_db),
) -> list[dict[str, Any]]:
    return build_current_predictions(db)

from __future__ import annotations

from typing import Any

from fastapi import APIRouter

from app.core.seed import load_seed
from app.modules.predictions.engine import build_predictions

router = APIRouter(prefix="/predictions", tags=["predictions"])


def _load_seed() -> dict[str, Any]:
    return load_seed()


@router.get("")
def list_predictions() -> list[dict[str, Any]]:
    return build_predictions(_load_seed())

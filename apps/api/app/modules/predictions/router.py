from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from fastapi import APIRouter

from app.modules.predictions.engine import build_predictions

router = APIRouter(prefix="/predictions", tags=["predictions"])
SEED_PATH = Path(__file__).resolve().parents[5] / "data" / "tripoli_seed.json"


def _load_seed() -> dict[str, Any]:
    return json.loads(SEED_PATH.read_text(encoding="utf-8"))


@router.get("")
def list_predictions() -> list[dict[str, Any]]:
    return build_predictions(_load_seed())

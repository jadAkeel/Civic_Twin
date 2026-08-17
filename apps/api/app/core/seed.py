import json
from functools import lru_cache
from pathlib import Path
from typing import Any


@lru_cache
def seed_path() -> Path:
    for parent in Path(__file__).resolve().parents:
        candidate = parent / "data" / "tripoli_seed.json"
        if candidate.exists():
            return candidate
    return Path("/app/data/tripoli_seed.json")


def load_seed() -> dict[str, Any]:
    return json.loads(seed_path().read_text(encoding="utf-8"))

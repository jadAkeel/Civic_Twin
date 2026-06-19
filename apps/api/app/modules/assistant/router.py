from __future__ import annotations

import json
from datetime import UTC, datetime
from typing import Any

from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.core.seed import load_seed
from app.modules.assistant.provider import MockCityDataProvider

router = APIRouter(prefix="/assistant", tags=["assistant"])
_queries: list[dict[str, Any]] = []
_provider = MockCityDataProvider()


class AssistantQuestion(BaseModel):
    question: str = Field(min_length=4, max_length=500)


def _load_seed() -> dict[str, Any]:
    return load_seed()


def reset_assistant_queries_for_tests() -> None:
    _queries.clear()


@router.post("/query", status_code=201)
def ask_city(payload: AssistantQuestion) -> dict[str, Any]:
    result = _provider.answer(payload.question, _load_seed())
    query = {
        "id": f"ai-query-{len(_queries) + 1}",
        "question": payload.question,
        "answer": result["answer"],
        "data_sources_json": result["sources"],
        "confidence_score": result["confidence_score"],
        "created_at": datetime.now(UTC).isoformat(),
        "provider": "mock_city_data",
    }
    _queries.insert(0, query)
    return query


@router.get("/queries")
def list_queries() -> list[dict[str, Any]]:
    return _queries

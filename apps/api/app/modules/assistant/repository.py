from __future__ import annotations

from copy import deepcopy
from datetime import UTC, datetime
from decimal import Decimal
from threading import RLock
from typing import Any
from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.ai_query import AIQuery
from app.models.user import User
from app.services.city_data import load_city_snapshot


_memory_queries: list[dict[str, Any]] = []
_memory_lock = RLock()


def reset_queries_for_tests() -> None:
    with _memory_lock:
        _memory_queries.clear()


def load_knowledge_snapshot(db: Session) -> dict[str, Any]:
    return load_city_snapshot(db)


def save_query(
    db: Session,
    *,
    user_email: str,
    question: str,
    result: dict[str, Any],
    provider: str,
) -> dict[str, Any]:
    if settings.operational_persistence_backend != "database":
        with _memory_lock:
            stored = {
                "id": f"ai-query-{uuid4()}",
                "question": question,
                "answer": result["answer"],
                "data_sources_json": deepcopy(result["sources"]),
                "confidence_score": result["confidence_score"],
                "provider": provider,
                "created_at": datetime.now(UTC).isoformat(),
            }
            _memory_queries.insert(0, stored)
            del _memory_queries[settings.assistant_history_limit :]
            return deepcopy(stored)

    user_id = db.scalar(select(User.id).where(User.email == user_email))
    if user_id is None:
        raise ValueError("The authenticated user is unavailable in the database audit context")
    row = AIQuery(
        user_id=user_id,
        question=question,
        answer=result["answer"],
        data_sources_json=deepcopy(result["sources"]),
        confidence_score=result["confidence_score"],
        provider=provider,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return _serialize_query(row)


def list_queries(db: Session, limit: int) -> list[dict[str, Any]]:
    if settings.operational_persistence_backend != "database":
        with _memory_lock:
            return deepcopy(_memory_queries[:limit])
    rows = db.scalars(select(AIQuery).order_by(AIQuery.created_at.desc(), AIQuery.id.desc()).limit(limit)).all()
    return [_serialize_query(row) for row in rows]


def _serialize_query(row: AIQuery) -> dict[str, Any]:
    return {
        "id": f"ai-query-{row.id}",
        "question": row.question,
        "answer": row.answer,
        "data_sources_json": deepcopy(row.data_sources_json),
        "confidence_score": _number(row.confidence_score),
        "provider": row.provider,
        "created_at": row.created_at.isoformat(),
    }


def _number(value: Decimal | int | float) -> float:
    return float(value)

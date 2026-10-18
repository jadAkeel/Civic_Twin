from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel, Field, field_validator
from sqlalchemy.orm import Session

from app.core.audit import record_audit_event
from app.core.config import settings
from app.core.rate_limit import enforce_rate_limit
from app.db.session import get_db
from app.modules.assistant.provider import (
    AssistantProviderError,
    build_assistant_provider,
    hosted_call_budget,
    redact_personal_data,
)
from app.modules.assistant.repository import (
    list_queries as list_stored_queries,
    load_knowledge_snapshot,
    reset_queries_for_tests,
    save_query,
)
from app.modules.auth.router import current_user, require_roles
from app.schemas.reports import contains_control_characters


router = APIRouter(prefix="/assistant", tags=["assistant"])
_provider = build_assistant_provider()
ASSISTANT_HISTORY_ROLES = ("owner", "municipality_admin", "decision_maker", "analyst")


class AssistantQuestion(BaseModel):
    question: str = Field(min_length=4, max_length=500)

    @field_validator("question")
    @classmethod
    def normalize_question(cls, value: str) -> str:
        # NUL and other control characters are rejected by PostgreSQL (a 500 when the
        # question is stored) and have no place in a question.
        if contains_control_characters(value):
            raise ValueError("Question contains control characters")
        normalized = " ".join(value.split())
        if len(normalized) < 4:
            raise ValueError("Question must contain at least four visible characters")
        return normalized


def reset_assistant_queries_for_tests() -> None:
    reset_queries_for_tests()
    hosted_call_budget.reset()


@router.post("/query", status_code=201)
def ask_city(
    payload: AssistantQuestion,
    request: Request,
    user: dict[str, Any] = Depends(current_user),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    enforce_rate_limit(
        request,
        db,
        scope="assistant.query",
        identity=user["email"],
        limit=settings.assistant_query_max_attempts,
        window_seconds=settings.public_query_window_seconds,
    )
    snapshot = load_knowledge_snapshot(db)
    # End the read transaction before the (possibly slow) hosted-model call so this
    # request does not pin a pooled connection for up to the provider timeout.
    db.commit()
    try:
        result = _provider.answer(payload.question, snapshot, safety_identifier=user["email"])
        stored = save_query(
            db,
            user_email=user["email"],
            # History is readable by staff, so contact details are never stored.
            question=redact_personal_data(payload.question),
            result=result,
            provider=result["provider"],
        )
    except AssistantProviderError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    record_audit_event(
        db,
        request,
        action="assistant.queried",
        resource_type="ai_query",
        actor_email=user["email"],
        resource_id=stored["id"],
        details={"provider": stored["provider"], "grounded": result["sources"]["grounded"]},
    )
    db.commit()
    return stored


@router.get("/queries")
def list_queries(
    limit: int = Query(default=25, ge=1, le=100),
    _: dict[str, Any] = Depends(require_roles(*ASSISTANT_HISTORY_ROLES)),
    db: Session = Depends(get_db),
) -> list[dict[str, Any]]:
    return list_stored_queries(db, limit)

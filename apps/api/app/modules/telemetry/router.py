"""Crash reports from the web app, so browser-side failures reach operators too.

Unauthenticated (a crash can happen before sign-in) but rate-limited and tightly
bounded; the report carries no user input, only what the error boundary knows.
"""

from __future__ import annotations

import json
import logging

from fastapi import APIRouter, Depends, Request, Response
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.monitoring import capture_client_error
from app.core.rate_limit import enforce_rate_limit
from app.db.session import get_db
from app.schemas.reports import CONTROL_CHARACTERS


router = APIRouter(prefix="/telemetry", tags=["telemetry"])
logger = logging.getLogger("citymind.web")


class ClientErrorReport(BaseModel):
    message: str = Field(default="", max_length=500)
    digest: str | None = Field(default=None, max_length=120)
    path: str = Field(default="", max_length=300)
    boundary: str = Field(default="route", max_length=40)
    release: str | None = Field(default=None, max_length=80)


def _clean(value: str | None) -> str:
    return CONTROL_CHARACTERS.sub(" ", value or "").strip()


@router.post("/client-errors", status_code=204, response_class=Response)
def report_client_error(payload: ClientErrorReport, request: Request, db: Session = Depends(get_db)) -> Response:
    enforce_rate_limit(
        request,
        db,
        scope="telemetry.client_error",
        limit=settings.client_error_max_attempts,
        window_seconds=settings.public_query_window_seconds,
    )
    fields = {
        "message": _clean(payload.message),
        "digest": _clean(payload.digest),
        # Path only: query strings and fragments can carry tokens.
        "path": _clean(payload.path).split("?", 1)[0].split("#", 1)[0],
        "boundary": _clean(payload.boundary),
        "release": _clean(payload.release),
    }
    logger.error(json.dumps({"event": "web_client_error", **fields}, ensure_ascii=False))
    capture_client_error(fields)
    return Response(status_code=204)

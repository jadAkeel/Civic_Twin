from __future__ import annotations

import logging
from typing import Any

from fastapi import Request
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.audit_event import AuditEvent


logger = logging.getLogger("citymind.audit")


def record_audit_event(
    db: Session,
    request: Request,
    *,
    action: str,
    resource_type: str,
    actor_email: str | None = None,
    resource_id: str | None = None,
    details: dict[str, Any] | None = None,
) -> None:
    request_id = getattr(request.state, "request_id", None)
    safe_details = details or {}
    logger.info(
        "audit_event action=%s resource_type=%s resource_id=%s actor=%s request_id=%s",
        action,
        resource_type,
        resource_id,
        actor_email,
        request_id,
    )
    if settings.operational_persistence_backend == "database":
        db.add(
            AuditEvent(
                actor_email=actor_email,
                action=action,
                resource_type=resource_type,
                resource_id=resource_id,
                request_id=request_id,
                details_json=safe_details,
            )
        )


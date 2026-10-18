"""Optional error monitoring (Sentry) with personal data stripped before sending.

Enabled only when SENTRY_DSN is set. Events never include request bodies (report
descriptions, passwords, questions), cookies, auth or CSRF headers, query strings
or the client IP; `send_default_pii` stays off.
"""

from __future__ import annotations

import logging
from typing import Any

from app.core.config import settings


logger = logging.getLogger("citymind.monitoring")
SENSITIVE_HEADERS = {"authorization", "cookie", "set-cookie", "x-csrf-token", "x-forwarded-for", "x-real-ip"}
_enabled = False


def _scrub(event: dict[str, Any], _hint: dict[str, Any]) -> dict[str, Any]:
    request = event.get("request")
    if isinstance(request, dict):
        request.pop("data", None)
        request.pop("cookies", None)
        request.pop("query_string", None)
        request.pop("env", None)
        headers = request.get("headers")
        if isinstance(headers, dict):
            request["headers"] = {
                key: value for key, value in headers.items() if key.lower() not in SENSITIVE_HEADERS
            }
    event.pop("user", None)
    return event


def init_monitoring() -> bool:
    """Start Sentry if configured; returns whether it is active."""
    global _enabled
    if settings.sentry_dsn is None or not settings.sentry_dsn.get_secret_value().strip():
        return False
    try:
        import sentry_sdk
    except ImportError:  # pragma: no cover - dependency is declared in pyproject
        logger.error("monitoring_unavailable reason=sentry_sdk_not_installed")
        return False
    sentry_sdk.init(
        dsn=settings.sentry_dsn.get_secret_value(),
        environment=settings.sentry_environment or settings.app_env,
        release=f"{settings.service_name}@{settings.version}",
        send_default_pii=False,
        traces_sample_rate=settings.sentry_traces_sample_rate,
        before_send=_scrub,
        max_request_body_size="never",
    )
    _enabled = True
    logger.info("monitoring_enabled provider=sentry")
    return True


def capture_client_error(fields: dict[str, str]) -> None:
    """Forward a browser-side crash reported by the web app."""
    if not _enabled:
        return
    import sentry_sdk

    with sentry_sdk.new_scope() as scope:
        scope.set_tag("source", "web")
        for key, value in fields.items():
            scope.set_extra(key, value)
        sentry_sdk.capture_message(f"web_client_error: {fields.get('message', '')[:200]}", level="error")

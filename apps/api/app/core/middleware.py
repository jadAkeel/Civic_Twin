from __future__ import annotations

import json
import logging
import re
from time import perf_counter
from uuid import uuid4

from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

from app.core.config import settings


logger = logging.getLogger("citymind.api")
REQUEST_ID_PATTERN = re.compile(r"^[A-Za-z0-9._-]{8,128}$")
NO_STORE_PREFIXES = ("/auth", "/admin", "/assistant", "/reports", "/scenarios")
SENSITIVE_QUERY_KEYS = {"token", "access_token", "password", "key", "api_key", "secret"}


def scrub_query(query: str) -> str:
    """Keep credentials that leaked into a query string out of the access log."""
    if not query:
        return ""
    parts = []
    for pair in query.split("&"):
        name, separator, _ = pair.partition("=")
        parts.append(f"{name}=[redacted]" if separator and name.lower() in SENSITIVE_QUERY_KEYS else pair)
    return "&".join(parts)


class RequestContextMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        supplied_request_id = request.headers.get("x-request-id", "")
        request_id = supplied_request_id if REQUEST_ID_PATTERN.fullmatch(supplied_request_id) else str(uuid4())
        request.state.request_id = request_id
        started_at = perf_counter()

        try:
            response = await call_next(request)
        except Exception:
            duration_ms = round((perf_counter() - started_at) * 1000, 2)
            self._log(
                logging.ERROR,
                request,
                request_id,
                status=500,
                duration_ms=duration_ms,
                event="request_failed",
                exc_info=True,
            )
            raise

        apply_security_headers(response, request, request_id)
        duration_ms = round((perf_counter() - started_at) * 1000, 2)
        self._log(
            logging.WARNING if response.status_code >= 500 else logging.INFO,
            request,
            request_id,
            status=response.status_code,
            duration_ms=duration_ms,
            event="request_complete",
        )
        return response

    @staticmethod
    def _log(
        level: int,
        request: Request,
        request_id: str,
        *,
        status: int,
        duration_ms: float,
        event: str,
        exc_info: bool = False,
    ) -> None:
        fields = {
            "event": event,
            "method": request.method,
            "path": request.url.path,
            "query": scrub_query(request.url.query),
            "status": status,
            "duration_ms": duration_ms,
            "request_id": request_id,
            "service": settings.service_name,
        }
        if settings.log_format == "json":
            logger.log(level, json.dumps(fields, ensure_ascii=False), exc_info=exc_info)
            return
        logger.log(
            level,
            "%s method=%s path=%s status=%s duration_ms=%s request_id=%s",
            event,
            fields["method"],
            fields["path"],
            status,
            duration_ms,
            request_id,
            exc_info=exc_info,
        )


def apply_security_headers(response: Response, request: Request, request_id: str) -> None:
    response.headers["X-Request-ID"] = request_id
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=(self)"
    response.headers["Cross-Origin-Opener-Policy"] = "same-origin"
    response.headers.setdefault("Cross-Origin-Resource-Policy", "same-site")
    if request.url.path.startswith(NO_STORE_PREFIXES):
        response.headers["Cache-Control"] = "no-store"
    if request.url.scheme == "https" or request.headers.get("x-forwarded-proto") == "https":
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"


BODY_METHODS = {"POST", "PUT", "PATCH"}


class BodySizeLimitMiddleware(BaseHTTPMiddleware):
    """Reject oversized request bodies before any handler parses them into memory.

    Only headers are inspected: reading the body here would consume the ASGI receive
    stream that the endpoint still needs.
    """

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        if request.method.upper() not in BODY_METHODS:
            return await call_next(request)

        limit = settings.max_request_body_bytes
        if "transfer-encoding" in request.headers:
            # The limit below trusts Content-Length. A request that also declares a
            # transfer coding could carry a body larger than it claims (and is a
            # classic request-smuggling shape), so it is refused outright.
            return JSONResponse(
                status_code=400,
                content={"detail": "Transfer-Encoding is not accepted; send a Content-Length body"},
            )
        declared_length = request.headers.get("content-length")
        if declared_length is None:
            return JSONResponse(
                status_code=411,
                content={"detail": "Content-Length is required for requests with a body"},
            )
        try:
            length = int(declared_length)
        except ValueError:
            return JSONResponse(status_code=400, content={"detail": "Invalid Content-Length header"})
        if length < 0 or length > limit:
            return JSONResponse(
                status_code=413,
                content={"detail": f"Request body must not exceed {limit} bytes"},
            )
        return await call_next(request)

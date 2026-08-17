from __future__ import annotations

import hashlib
import hmac
from datetime import UTC, datetime, timedelta
from threading import RLock

from fastapi import HTTPException, Request
from sqlalchemy import case, delete
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.rate_limit_bucket import RateLimitBucket


_memory_buckets: dict[str, tuple[datetime, int]] = {}
_memory_lock = RLock()


def _client_host(request: Request) -> str:
    return request.client.host if request.client else "unknown"


def _key_hash(request: Request, scope: str, identity: str | None) -> str:
    raw_key = f"{scope}:{_client_host(request)}:{(identity or '').strip().lower()}".encode()
    return hmac.new(
        settings.auth_token_secret.get_secret_value().encode(),
        raw_key,
        hashlib.sha256,
    ).hexdigest()


def enforce_rate_limit(
    request: Request,
    db: Session,
    *,
    scope: str,
    limit: int,
    window_seconds: int,
    identity: str | None = None,
) -> None:
    key_hash = _key_hash(request, scope, identity)
    now = datetime.now(UTC)
    cutoff = now - timedelta(seconds=window_seconds)

    if settings.rate_limit_backend == "database":
        expired = RateLimitBucket.window_started_at < cutoff
        statement = (
            insert(RateLimitBucket)
            .values(
                key_hash=key_hash,
                scope=scope,
                window_started_at=now,
                request_count=1,
            )
            .on_conflict_do_update(
                index_elements=[RateLimitBucket.key_hash],
                set_={
                    "scope": scope,
                    "window_started_at": case((expired, now), else_=RateLimitBucket.window_started_at),
                    "request_count": case((expired, 1), else_=RateLimitBucket.request_count + 1),
                },
            )
            .returning(RateLimitBucket.request_count, RateLimitBucket.window_started_at)
        )
        request_count, window_started_at = db.execute(statement).one()
        db.commit()
    else:
        with _memory_lock:
            if key_hash not in _memory_buckets and len(_memory_buckets) >= settings.login_rate_limit_max_keys:
                _memory_buckets.pop(next(iter(_memory_buckets)))
            window_started_at, request_count = _memory_buckets.get(key_hash, (now, 0))
            if window_started_at < cutoff:
                window_started_at, request_count = now, 0
            request_count += 1
            _memory_buckets[key_hash] = (window_started_at, request_count)

    if request_count > limit:
        elapsed = max(0, int((now - window_started_at).total_seconds()))
        retry_after = max(1, window_seconds - elapsed)
        raise HTTPException(
            status_code=429,
            detail="Too many requests. Try again later.",
            headers={"Retry-After": str(retry_after)},
        )


def reset_rate_limits_for_tests() -> None:
    with _memory_lock:
        _memory_buckets.clear()


def clear_rate_limit(request: Request, db: Session, *, scope: str, identity: str | None = None) -> None:
    key_hash = _key_hash(request, scope, identity)
    if settings.rate_limit_backend == "database":
        db.execute(delete(RateLimitBucket).where(RateLimitBucket.key_hash == key_hash))
        db.commit()
        return
    with _memory_lock:
        _memory_buckets.pop(key_hash, None)

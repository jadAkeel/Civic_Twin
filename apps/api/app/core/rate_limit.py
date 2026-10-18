from __future__ import annotations

import hashlib
import hmac
import ipaddress
import logging
from datetime import UTC, datetime, timedelta
from threading import RLock

from fastapi import HTTPException, Request
from sqlalchemy import case, delete
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.rate_limit_bucket import RateLimitBucket


logger = logging.getLogger("citymind.rate_limit")

_memory_buckets: dict[str, tuple[datetime, int]] = {}
_memory_lock = RLock()
_last_sweep: datetime | None = None
_sweep_lock = RLock()

def _client_host(request: Request) -> str:
    # X-Forwarded-For is deliberately not read here: any client can forge it. Behind
    # a reverse proxy, uvicorn --proxy-headers with FORWARDED_ALLOW_IPS rewrites
    # request.client to the real address, and only for the proxies listed there.
    host = request.client.host if request.client else "unknown"
    try:
        address = ipaddress.ip_address(host)
    except ValueError:
        return host
    # One IPv6 subscriber usually owns a whole /64; keying on the full address would
    # hand every client 2^64 fresh buckets.
    if isinstance(address, ipaddress.IPv6Address):
        # ::ffff:1.2.3.4 is an IPv4 client seen through a dual-stack socket.
        if address.ipv4_mapped is not None:
            return str(address.ipv4_mapped)
        return str(ipaddress.ip_network(f"{address}/64", strict=False))
    return str(address)


def _key_hash(request: Request, scope: str, identity: str | None, *, per_client: bool = True) -> str:
    client = _client_host(request) if per_client else "*"
    raw_key = f"{scope}:{client}:{(identity or '').strip().lower()}".encode()
    return hmac.new(
        settings.auth_token_secret.get_secret_value().encode(),
        raw_key,
        hashlib.sha256,
    ).hexdigest()


def _sweep_expired_buckets(session: Session, now: datetime) -> None:
    """Drop long-idle buckets so the table cannot grow without bound."""
    global _last_sweep
    with _sweep_lock:
        if _last_sweep is not None and (now - _last_sweep).total_seconds() < settings.rate_limit_sweep_interval_seconds:
            return
        _last_sweep = now
    session.execute(
        delete(RateLimitBucket).where(
            RateLimitBucket.window_started_at < now - timedelta(seconds=settings.rate_limit_retention_seconds)
        )
    )


def _database_bucket(key_hash: str, scope: str, now: datetime, cutoff: datetime) -> tuple[int, datetime]:
    """Count this request in its own transaction so the caller's work is never committed early."""
    expired = RateLimitBucket.window_started_at < cutoff
    statement = (
        insert(RateLimitBucket)
        .values(key_hash=key_hash, scope=scope, window_started_at=now, request_count=1)
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
    # Imported lazily so importing this module never forces engine construction.
    from app.db.session import auxiliary_sessionmaker

    with auxiliary_sessionmaker()() as session:
        request_count, window_started_at = session.execute(statement).one()
        _sweep_expired_buckets(session, now)
        session.commit()
    return int(request_count), window_started_at


def enforce_rate_limit(
    request: Request,
    db: Session,
    *,
    scope: str,
    limit: int,
    window_seconds: int,
    identity: str | None = None,
    per_client: bool = True,
) -> None:
    """Count one request against a bucket and raise 429 once it is over `limit`.

    per_client=False shares one bucket for the identity across every client address,
    which is what protects a single account from a botnet or rotating IPs.
    """
    del db  # Rate limiting owns its transaction; see _database_bucket.
    key_hash = _key_hash(request, scope, identity, per_client=per_client)
    now = datetime.now(UTC)
    cutoff = now - timedelta(seconds=window_seconds)

    if settings.rate_limit_backend == "database":
        try:
            request_count, window_started_at = _database_bucket(key_hash, scope, now, cutoff)
        except SQLAlchemyError:
            # Never let a rate-limit storage outage take the whole API down; fall back
            # to the per-process counter and record it for operators.
            logger.exception("rate_limit_storage_unavailable scope=%s", scope)
            request_count, window_started_at = _memory_bucket(key_hash, now, cutoff)
    else:
        request_count, window_started_at = _memory_bucket(key_hash, now, cutoff)

    if request_count > limit:
        elapsed = max(0, int((now - window_started_at).total_seconds()))
        retry_after = max(1, window_seconds - elapsed)
        raise HTTPException(
            status_code=429,
            detail="Too many requests. Try again later.",
            headers={"Retry-After": str(retry_after)},
        )


def _memory_bucket(key_hash: str, now: datetime, cutoff: datetime) -> tuple[int, datetime]:
    with _memory_lock:
        if key_hash not in _memory_buckets and len(_memory_buckets) >= settings.login_rate_limit_max_keys:
            _memory_buckets.pop(next(iter(_memory_buckets)))
        window_started_at, request_count = _memory_buckets.get(key_hash, (now, 0))
        if window_started_at < cutoff:
            window_started_at, request_count = now, 0
        request_count += 1
        _memory_buckets[key_hash] = (window_started_at, request_count)
        return request_count, window_started_at


def reset_rate_limits_for_tests() -> None:
    global _last_sweep
    with _memory_lock:
        _memory_buckets.clear()
    with _sweep_lock:
        _last_sweep = None


def clear_rate_limit(
    request: Request,
    db: Session,
    *,
    scope: str,
    identity: str | None = None,
    per_client: bool = True,
) -> None:
    del db
    key_hash = _key_hash(request, scope, identity, per_client=per_client)
    if settings.rate_limit_backend == "database":
        from app.db.session import auxiliary_sessionmaker

        try:
            with auxiliary_sessionmaker()() as session:
                session.execute(delete(RateLimitBucket).where(RateLimitBucket.key_hash == key_hash))
                session.commit()
        except SQLAlchemyError:
            logger.exception("rate_limit_clear_failed scope=%s", scope)
        return
    with _memory_lock:
        _memory_buckets.pop(key_hash, None)

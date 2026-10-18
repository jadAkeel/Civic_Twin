from __future__ import annotations

from collections.abc import Generator
from threading import Lock

from sqlalchemy import create_engine
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import settings


def _connect_args() -> dict[str, object]:
    """Driver options that bound how long a single connection or statement may hang."""
    if not settings.database_url.startswith("postgresql"):
        return {}
    return {
        "connect_timeout": settings.database_connect_timeout_seconds,
        "application_name": settings.service_name,
        "options": f"-c statement_timeout={settings.database_statement_timeout_ms}",
    }


def build_engine() -> Engine:
    return create_engine(
        settings.database_url,
        pool_pre_ping=True,
        pool_size=settings.database_pool_size,
        max_overflow=settings.database_max_overflow,
        pool_timeout=settings.database_pool_timeout_seconds,
        pool_recycle=settings.database_pool_recycle_seconds,
        connect_args=_connect_args(),
        future=True,
    )


engine = build_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

_auxiliary_engine: Engine | None = None
_auxiliary_sessionmaker: sessionmaker[Session] | None = None
_auxiliary_lock = Lock()


def auxiliary_sessionmaker() -> sessionmaker[Session]:
    """A small, separate pool for bookkeeping that runs mid-request (rate limits).

    A request already holds one connection from the main pool; taking a second one
    from the same pool deadlocks under load (every request holds one and waits for
    another). A dedicated pool can never be starved by request sessions.
    """
    global _auxiliary_engine, _auxiliary_sessionmaker
    if _auxiliary_sessionmaker is not None:
        return _auxiliary_sessionmaker
    with _auxiliary_lock:
        if _auxiliary_sessionmaker is not None:
            return _auxiliary_sessionmaker
        _auxiliary_engine = create_engine(
            settings.database_url,
            pool_pre_ping=True,
            pool_size=2,
            max_overflow=3,
            pool_timeout=5,
            pool_recycle=settings.database_pool_recycle_seconds,
            connect_args=_connect_args(),
            future=True,
        )
        _auxiliary_sessionmaker = sessionmaker(autocommit=False, autoflush=False, bind=_auxiliary_engine)
        return _auxiliary_sessionmaker


def get_db() -> Generator[Session, None, None]:
    """Request-scoped session that always rolls back work left uncommitted by a failed handler."""
    db = SessionLocal()
    try:
        yield db
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def dispose_engine() -> None:
    engine.dispose()
    if _auxiliary_engine is not None:
        _auxiliary_engine.dispose()

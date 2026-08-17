from sqlalchemy import text
from sqlalchemy.orm import Session


def check_database_connection(db: Session) -> bool:
    return db.execute(text("SELECT 1")).scalar_one() == 1


def check_postgis_extension(db: Session) -> bool:
    query = text("SELECT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'postgis')")
    return bool(db.execute(query).scalar_one())


def check_migration_current(db: Session, expected_revision: str) -> bool:
    query = text("SELECT version_num FROM alembic_version LIMIT 1")
    return db.execute(query).scalar_one_or_none() == expected_revision


def check_operational_data(db: Session) -> bool:
    query = text(
        """
        SELECT
          EXISTS (SELECT 1 FROM users WHERE is_active = true AND password_hash IS NOT NULL)
          AND EXISTS (SELECT 1 FROM neighborhoods)
          AND EXISTS (SELECT 1 FROM green_metrics)
          AND EXISTS (SELECT 1 FROM walkability_metrics)
        """
    )
    return bool(db.execute(query).scalar_one())

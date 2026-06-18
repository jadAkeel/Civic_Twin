from sqlalchemy import text
from sqlalchemy.orm import Session


def check_database_connection(db: Session) -> bool:
    return db.execute(text("SELECT 1")).scalar_one() == 1


def check_postgis_extension(db: Session) -> bool:
    query = text("SELECT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'postgis')")
    return bool(db.execute(query).scalar_one())

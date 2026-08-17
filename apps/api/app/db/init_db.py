from sqlalchemy.orm import Session

from app.db.base import Base
from app.db.session import engine
from app.models import *  # noqa: F403


def create_database_schema() -> None:
    Base.metadata.create_all(bind=engine)


def init_db(_: Session | None = None) -> None:
    create_database_schema()

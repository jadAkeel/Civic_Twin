from datetime import datetime

from sqlalchemy import Boolean, CheckConstraint, DateTime, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin
from app.models.enums import USER_ROLES


class User(TimestampMixin, Base):
    __tablename__ = "users"
    __table_args__ = (
        CheckConstraint(f"role IN {USER_ROLES}", name="user_role_allowed"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    full_name: Mapped[str] = mapped_column(String(160), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    password_hash: Mapped[str | None] = mapped_column(String(512))
    role: Mapped[str] = mapped_column(String(40), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, server_default="true")
    # Null until the owner of the address follows the verification link. Accounts
    # created by an owner (or bootstrapped) are verified on creation.
    email_verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    token_version: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    tenant_key: Mapped[str] = mapped_column(
        String(80),
        nullable=False,
        default="citymind-tripoli",
        server_default="citymind-tripoli",
        index=True,
    )

    reports = relationship("IssueReport", back_populates="created_by")
    scenarios = relationship("Scenario", back_populates="created_by")
    ai_queries = relationship("AIQuery", back_populates="user")

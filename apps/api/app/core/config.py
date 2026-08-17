from __future__ import annotations

from functools import lru_cache
from typing import Literal

from pydantic import Field, SecretStr, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


LOCAL_AUTH_SECRET = "citymind-local-development-secret-change-before-production"
LOCAL_DATABASE_URL = "postgresql+psycopg://citymind:citymind@localhost:5432/citymind"
PRODUCTION_ENVIRONMENTS = {"production", "prod"}


class Settings(BaseSettings):
    project_name: str = "CityMind Tripoli"
    city_name: str = "Tripoli"
    country_name: str = "Lebanon"
    app_env: str = "local"
    version: str = "0.1.0"
    service_name: str = "citymind-tripoli-api"
    log_level: str = "INFO"

    database_url: str = LOCAL_DATABASE_URL
    database_readiness_required: bool = False
    operational_persistence_backend: Literal["memory", "database"] = "memory"
    scenario_persistence_backend: Literal["memory", "database"] = "memory"
    scenario_history_limit: int = Field(default=100, ge=1, le=1000)

    cors_origins: list[str] = Field(
        default_factory=lambda: [
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "http://127.0.0.1:3100",
            "http://127.0.0.1:3101",
            "http://127.0.0.1:3102",
            "http://127.0.0.1:3103",
            "http://127.0.0.1:3104",
            "http://127.0.0.1:3105",
            "http://127.0.0.1:3106",
            "http://127.0.0.1:3107",
        ]
    )
    trusted_hosts: list[str] = Field(default_factory=lambda: ["localhost", "127.0.0.1", "testserver"])
    docs_enabled: bool = True

    auth_token_secret: SecretStr = SecretStr(LOCAL_AUTH_SECRET)
    auth_token_ttl_seconds: int = Field(default=3600, ge=300, le=86_400)
    auth_token_issuer: str = "citymind-tripoli-api"
    auth_cookie_name: str = "citymind_session"
    auth_cookie_same_site: Literal["lax", "strict", "none"] = "lax"
    auth_cookie_domain: str | None = None
    password_hash_iterations: int = Field(default=310_000, ge=120_000, le=1_000_000)
    login_max_attempts: int = Field(default=5, ge=3, le=20)
    login_ip_max_attempts: int = Field(default=30, ge=5, le=500)
    login_window_seconds: int = Field(default=60, ge=10, le=3600)
    login_rate_limit_max_keys: int = Field(default=10_000, ge=100, le=100_000)
    rate_limit_backend: Literal["memory", "database"] = "memory"
    register_max_attempts: int = Field(default=5, ge=1, le=50)
    report_create_max_attempts: int = Field(default=20, ge=1, le=500)
    assistant_query_max_attempts: int = Field(default=30, ge=1, le=500)
    public_query_window_seconds: int = Field(default=60, ge=10, le=3600)

    ai_provider: Literal["local_rag", "openai"] = "local_rag"
    openai_api_key: SecretStr | None = None
    openai_api_base_url: str = "https://api.openai.com/v1"
    openai_model: str = "gpt-5.6-sol"
    openai_reasoning_effort: Literal["none", "low", "medium"] = "low"
    openai_timeout_seconds: float = Field(default=30.0, ge=2.0, le=120.0)
    openai_max_output_tokens: int = Field(default=700, ge=100, le=4000)
    ai_allow_local_fallback: bool = True
    assistant_history_limit: int = Field(default=100, ge=1, le=1000)
    rag_top_k: int = Field(default=4, ge=1, le=10)
    rag_min_score: float = Field(default=0.34, ge=0.01, le=1.0)

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def is_production(self) -> bool:
        return self.app_env.strip().lower() in PRODUCTION_ENVIRONMENTS

    @model_validator(mode="after")
    def reject_unsafe_production_configuration(self) -> "Settings":
        if self.auth_cookie_same_site == "none" and not self.is_production:
            raise ValueError("AUTH_COOKIE_SAME_SITE=None is only supported by the secure production profile")
        if not self.is_production:
            return self

        secret = self.auth_token_secret.get_secret_value()
        if secret == LOCAL_AUTH_SECRET or len(secret) < 32:
            raise ValueError("AUTH_TOKEN_SECRET must be a unique secret of at least 32 characters in production")
        if self.docs_enabled:
            raise ValueError("DOCS_ENABLED must be false in production")
        if not self.database_readiness_required:
            raise ValueError("DATABASE_READINESS_REQUIRED must be true in production")
        if self.database_url == LOCAL_DATABASE_URL or "@localhost" in self.database_url or "@127.0.0.1" in self.database_url:
            raise ValueError("DATABASE_URL must target a non-local production database")
        if self.scenario_persistence_backend != "database":
            raise ValueError("SCENARIO_PERSISTENCE_BACKEND must be database in production")
        if self.operational_persistence_backend != "database":
            raise ValueError("OPERATIONAL_PERSISTENCE_BACKEND must be database in production")
        if self.rate_limit_backend != "database":
            raise ValueError("RATE_LIMIT_BACKEND must be database in production")
        if self.ai_provider == "openai" and not (
            self.openai_api_key and self.openai_api_key.get_secret_value().strip()
        ):
            raise ValueError("OPENAI_API_KEY is required when AI_PROVIDER=openai")
        if self.ai_provider == "openai" and not self.openai_api_base_url.startswith("https://"):
            raise ValueError("OPENAI_API_BASE_URL must use HTTPS in production")
        if not self.cors_origins or "*" in self.cors_origins:
            raise ValueError("CORS_ORIGINS must contain explicit trusted origins in production")
        if any(not origin.startswith("https://") for origin in self.cors_origins):
            raise ValueError("CORS_ORIGINS must use HTTPS in production")
        if not self.trusted_hosts or "*" in self.trusted_hosts:
            raise ValueError("TRUSTED_HOSTS must contain explicit hosts in production")
        return self

    @property
    def auth_cookie_secure(self) -> bool:
        return self.is_production


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()

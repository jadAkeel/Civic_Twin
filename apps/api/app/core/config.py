from __future__ import annotations

from functools import lru_cache
from typing import Literal
from urllib.parse import urlsplit

from pydantic import Field, SecretStr, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


LOCAL_AUTH_SECRET = "citymind-local-development-secret-change-before-production"
LOCAL_DATABASE_URL = "postgresql+psycopg://citymind:citymind@localhost:5432/citymind"
PRODUCTION_ENVIRONMENTS = {"production", "prod"}
# Only these names may run with the public development secret. Anything else
# (staging, prd, a typo) is treated as a real deployment and must bring its own.
DEVELOPMENT_ENVIRONMENTS = {"local", "development", "dev", "test", "testing", "ci"}
AIProvider = Literal["local_rag", "openai", "gemini"]


class Settings(BaseSettings):
    project_name: str = "CityMind Tripoli"
    city_name: str = "Tripoli"
    country_name: str = "Lebanon"
    app_env: str = "local"
    version: str = "1.0.0"
    service_name: str = "citymind-tripoli-api"
    log_level: str = "INFO"
    log_format: Literal["text", "json"] = "text"

    database_url: str = LOCAL_DATABASE_URL
    database_readiness_required: bool = False
    database_pool_size: int = Field(default=5, ge=1, le=100)
    database_max_overflow: int = Field(default=10, ge=0, le=100)
    database_pool_timeout_seconds: int = Field(default=30, ge=1, le=300)
    database_pool_recycle_seconds: int = Field(default=1800, ge=60, le=86_400)
    database_connect_timeout_seconds: int = Field(default=10, ge=1, le=60)
    database_statement_timeout_ms: int = Field(default=15_000, ge=1_000, le=120_000)
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
    max_request_body_bytes: int = Field(default=256_000, ge=4_096, le=10_485_760)

    auth_token_secret: SecretStr = SecretStr(LOCAL_AUTH_SECRET)
    auth_token_ttl_seconds: int = Field(default=3600, ge=300, le=86_400)
    auth_token_refresh_threshold_seconds: int = Field(default=900, ge=60, le=43_200)
    # Hard ceiling on a sliding cookie session: after this long since sign-in the
    # user must authenticate again, so a stolen cookie cannot live forever.
    auth_session_max_age_seconds: int = Field(default=43_200, ge=900, le=2_592_000)
    # Force the Secure cookie flag outside production (e.g. an HTTPS staging host).
    auth_cookie_force_secure: bool = False
    auth_token_issuer: str = "citymind-tripoli-api"
    auth_cookie_name: str = "citymind_session"
    auth_cookie_same_site: Literal["lax", "strict", "none"] = "lax"
    auth_cookie_domain: str | None = None
    password_hash_iterations: int = Field(default=310_000, ge=120_000, le=1_000_000)
    password_min_length: int = Field(default=10, ge=8, le=128)
    login_max_attempts: int = Field(default=5, ge=3, le=20)
    login_ip_max_attempts: int = Field(default=30, ge=5, le=500)
    login_window_seconds: int = Field(default=60, ge=10, le=3600)
    login_rate_limit_max_keys: int = Field(default=10_000, ge=100, le=100_000)
    rate_limit_backend: Literal["memory", "database"] = "memory"
    rate_limit_sweep_interval_seconds: int = Field(default=300, ge=30, le=86_400)
    rate_limit_retention_seconds: int = Field(default=3600, ge=60, le=86_400)
    register_max_attempts: int = Field(default=5, ge=1, le=50)
    report_create_max_attempts: int = Field(default=20, ge=1, le=500)
    assistant_query_max_attempts: int = Field(default=30, ge=1, le=500)
    public_read_max_attempts: int = Field(default=120, ge=10, le=5000)
    public_query_window_seconds: int = Field(default=60, ge=10, le=3600)
    reports_page_size_max: int = Field(default=200, ge=10, le=1000)

    # Demo identities ship with publicly documented passwords. They must never be
    # created automatically in a production database.
    allow_demo_users: bool = False
    bootstrap_owner_email: str | None = None
    bootstrap_owner_password: SecretStr | None = None

    # Public address of the web app; account emails link back to it.
    public_web_url: str | None = None

    # Transactional email (verification and password reset). "console" logs messages
    # for local development; production requires "smtp" (SendGrid, Amazon SES,
    # Brevo, Mailgun and Postmark all expose SMTP).
    email_backend: Literal["disabled", "console", "smtp"] = "console"
    email_from: str | None = None
    email_from_name: str = "CityMind Tripoli"
    smtp_host: str | None = None
    smtp_port: int = Field(default=587, ge=1, le=65_535)
    smtp_username: str | None = None
    smtp_password: SecretStr | None = None
    smtp_security: Literal["starttls", "ssl", "none"] = "starttls"
    smtp_timeout_seconds: float = Field(default=10.0, ge=1.0, le=60.0)
    # None means "required in production, optional elsewhere".
    email_verification_required: bool | None = None
    email_verification_ttl_seconds: int = Field(default=172_800, ge=900, le=1_209_600)
    password_reset_ttl_seconds: int = Field(default=1800, ge=300, le=86_400)
    account_email_max_attempts: int = Field(default=5, ge=1, le=100)
    account_email_window_seconds: int = Field(default=900, ge=60, le=86_400)
    # Version of the privacy notice a resident accepts when registering.
    privacy_policy_version: str = "2026-09-23"

    # Error monitoring. Unset means disabled; events never include bodies, cookies
    # or auth headers (see app/core/monitoring.py).
    sentry_dsn: SecretStr | None = None
    sentry_environment: str | None = None
    sentry_traces_sample_rate: float = Field(default=0.0, ge=0.0, le=1.0)
    client_error_max_attempts: int = Field(default=20, ge=1, le=1000)

    ai_provider: AIProvider = "local_rag"
    ai_allow_local_fallback: bool = True
    openai_api_key: SecretStr | None = None
    openai_api_base_url: str = "https://api.openai.com/v1"
    openai_model: str = "gpt-4.1-mini"
    # Only sent to reasoning models (o-series, gpt-5*); other models reject it.
    openai_reasoning_effort: Literal["none", "minimal", "low", "medium"] = "low"
    openai_timeout_seconds: float = Field(default=30.0, ge=2.0, le=120.0)
    openai_max_output_tokens: int = Field(default=2048, ge=100, le=16_000)
    gemini_api_key: SecretStr | None = None
    gemini_api_base_url: str = "https://generativelanguage.googleapis.com/v1beta"
    # gemini-2.0-flash was shut down on 2026-06-01; 3.5 Flash-Lite is Google's
    # recommended stable model for new, high-throughput projects.
    gemini_model: str = "gemini-3.5-flash-lite"
    gemini_timeout_seconds: float = Field(default=30.0, ge=2.0, le=120.0)
    # Generous on purpose: thinking models spend output tokens before the answer,
    # and a truncated JSON answer only falls back to the local one.
    gemini_max_output_tokens: int = Field(default=2048, ge=100, le=16_000)
    gemini_temperature: float = Field(default=0.2, ge=0.0, le=1.0)
    assistant_history_limit: int = Field(default=100, ge=1, le=1000)
    # Global ceiling on hosted-model calls per day across all users; once reached the
    # assistant keeps answering from local evidence. 0 disables hosted calls.
    ai_hosted_daily_request_limit: int = Field(default=2000, ge=0, le=1_000_000)
    ai_query_retention_days: int = Field(default=180, ge=1, le=3650)
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

    @property
    def requires_email_verification(self) -> bool:
        if self.email_verification_required is None:
            return self.is_production
        return self.email_verification_required

    @property
    def is_development(self) -> bool:
        return self.app_env.strip().lower() in DEVELOPMENT_ENVIRONMENTS

    @property
    def auth_cookie_secure(self) -> bool:
        return self.is_production or self.auth_cookie_force_secure

    @property
    def ai_api_key(self) -> SecretStr | None:
        if self.ai_provider == "openai":
            return self.openai_api_key
        if self.ai_provider == "gemini":
            return self.gemini_api_key
        return None

    @property
    def ai_model(self) -> str | None:
        if self.ai_provider == "openai":
            return self.openai_model
        if self.ai_provider == "gemini":
            return self.gemini_model
        return None

    @property
    def ai_api_base_url(self) -> str | None:
        if self.ai_provider == "openai":
            return self.openai_api_base_url
        if self.ai_provider == "gemini":
            return self.gemini_api_base_url
        return None

    @model_validator(mode="after")
    def reject_unsafe_configuration(self) -> "Settings":
        for label, base_url in (
            ("OPENAI_API_BASE_URL", self.openai_api_base_url),
            ("GEMINI_API_BASE_URL", self.gemini_api_base_url),
        ):
            scheme = urlsplit(base_url).scheme
            if scheme not in {"http", "https"}:
                raise ValueError(f"{label} must be an http(s) URL")

        if self.auth_cookie_same_site == "none" and not self.is_production:
            raise ValueError("AUTH_COOKIE_SAME_SITE=None is only supported by the secure production profile")
        if self.auth_token_refresh_threshold_seconds >= self.auth_token_ttl_seconds:
            raise ValueError("AUTH_TOKEN_REFRESH_THRESHOLD_SECONDS must be shorter than AUTH_TOKEN_TTL_SECONDS")
        if self.bootstrap_owner_email and not self.bootstrap_owner_password:
            raise ValueError("BOOTSTRAP_OWNER_PASSWORD is required when BOOTSTRAP_OWNER_EMAIL is set")
        if self.bootstrap_owner_password and not self.bootstrap_owner_email:
            raise ValueError("BOOTSTRAP_OWNER_EMAIL is required when BOOTSTRAP_OWNER_PASSWORD is set")
        if self.bootstrap_owner_password:
            # Imported lazily: security.py reads these settings at call time.
            from app.core.security import PasswordPolicyError, validate_password_strength

            try:
                validate_password_strength(
                    self.bootstrap_owner_password.get_secret_value(),
                    email=self.bootstrap_owner_email,
                    min_length=self.password_min_length,
                )
            except PasswordPolicyError as exc:
                raise ValueError(f"BOOTSTRAP_OWNER_PASSWORD is too weak: {exc}") from None
        if self.email_backend == "smtp" and not (self.smtp_host and self.email_from):
            raise ValueError("EMAIL_BACKEND=smtp requires SMTP_HOST and EMAIL_FROM")
        if self.public_web_url and urlsplit(self.public_web_url).scheme not in {"http", "https"}:
            raise ValueError("PUBLIC_WEB_URL must be an http(s) URL")
        longest_window = max(
            self.login_window_seconds, self.public_query_window_seconds, self.account_email_window_seconds
        )
        if self.rate_limit_retention_seconds < longest_window:
            raise ValueError(
                "RATE_LIMIT_RETENTION_SECONDS must be at least as long as the longest rate-limit window"
            )
        if self.auth_session_max_age_seconds < self.auth_token_ttl_seconds:
            raise ValueError("AUTH_SESSION_MAX_AGE_SECONDS must not be shorter than AUTH_TOKEN_TTL_SECONDS")

        secret = self.auth_token_secret.get_secret_value()
        if not self.is_development and (secret == LOCAL_AUTH_SECRET or len(secret) < 32):
            # Fail closed: only named development environments may use the public
            # secret, otherwise anyone could forge an owner session.
            raise ValueError(
                "AUTH_TOKEN_SECRET must be a unique secret of at least 32 characters outside local development "
                f"(APP_ENV={self.app_env!r})"
            )

        if not self.is_production:
            return self

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
        if self.allow_demo_users:
            raise ValueError("ALLOW_DEMO_USERS must be false in production; demo passwords are publicly documented")
        if self.email_backend != "smtp":
            raise ValueError(
                "EMAIL_BACKEND must be smtp in production; without it residents cannot verify their email "
                "or reset a forgotten password"
            )
        if not self.public_web_url or not self.public_web_url.startswith("https://"):
            raise ValueError("PUBLIC_WEB_URL must be the HTTPS address of the web app in production")
        if self.ai_provider == "openai":
            if not (self.openai_api_key and self.openai_api_key.get_secret_value().strip()):
                raise ValueError("OPENAI_API_KEY is required when AI_PROVIDER=openai")
            if not self.openai_api_base_url.startswith("https://"):
                raise ValueError("OPENAI_API_BASE_URL must use HTTPS in production")
        if self.ai_provider == "gemini":
            if not (self.gemini_api_key and self.gemini_api_key.get_secret_value().strip()):
                raise ValueError("GEMINI_API_KEY is required when AI_PROVIDER=gemini")
            if not self.gemini_api_base_url.startswith("https://"):
                raise ValueError("GEMINI_API_BASE_URL must use HTTPS in production")
        if not self.cors_origins or "*" in self.cors_origins:
            raise ValueError("CORS_ORIGINS must contain explicit trusted origins in production")
        if any(not origin.startswith("https://") for origin in self.cors_origins):
            raise ValueError("CORS_ORIGINS must use HTTPS in production")
        if not self.trusted_hosts or "*" in self.trusted_hosts:
            raise ValueError("TRUSTED_HOSTS must contain explicit hosts in production")
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()

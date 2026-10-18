import pytest
from pydantic import ValidationError

from app.core.config import LOCAL_AUTH_SECRET, Settings


SAFE_PRODUCTION_VALUES: dict[str, object] = {
    "app_env": "production",
    "auth_token_secret": "a-production-secret-that-is-longer-than-32-characters",
    "docs_enabled": False,
    "database_readiness_required": True,
    "database_url": "postgresql+psycopg://citymind:secure-password@db:5432/citymind",
    "scenario_persistence_backend": "database",
    "operational_persistence_backend": "database",
    "rate_limit_backend": "database",
    "allow_demo_users": False,
    "ai_provider": "local_rag",
    "cors_origins": ["https://citymind.example"],
    "trusted_hosts": ["api.citymind.example"],
    "email_backend": "smtp",
    "smtp_host": "smtp.example.net",
    "email_from": "no-reply@citymind.example",
    "public_web_url": "https://citymind.example",
}


def production_settings(**overrides: object) -> Settings:
    return Settings(_env_file=None, **{**SAFE_PRODUCTION_VALUES, **overrides})


@pytest.mark.parametrize(
    ("override", "message"),
    [
        ({"auth_token_secret": LOCAL_AUTH_SECRET}, "AUTH_TOKEN_SECRET"),
        ({"docs_enabled": True}, "DOCS_ENABLED"),
        ({"database_readiness_required": False}, "DATABASE_READINESS_REQUIRED"),
        ({"database_url": "postgresql+psycopg://citymind:citymind@localhost:5432/citymind"}, "DATABASE_URL"),
        ({"scenario_persistence_backend": "memory"}, "SCENARIO_PERSISTENCE_BACKEND"),
        ({"operational_persistence_backend": "memory"}, "OPERATIONAL_PERSISTENCE_BACKEND"),
        ({"rate_limit_backend": "memory"}, "RATE_LIMIT_BACKEND"),
        ({"allow_demo_users": True}, "ALLOW_DEMO_USERS"),
        ({"email_backend": "console"}, "EMAIL_BACKEND"),
        ({"public_web_url": "http://citymind.example"}, "PUBLIC_WEB_URL"),
        ({"smtp_host": None}, "SMTP_HOST"),
        ({"ai_provider": "mock"}, "ai_provider"),
        ({"cors_origins": ["*"]}, "CORS_ORIGINS"),
        ({"cors_origins": ["http://citymind.example"]}, "CORS_ORIGINS"),
        ({"trusted_hosts": ["*"]}, "TRUSTED_HOSTS"),
    ],
)
def test_production_settings_reject_unsafe_values(override: dict[str, object], message: str) -> None:
    with pytest.raises(ValidationError, match=message):
        production_settings(**override)


def test_production_settings_accept_explicit_secure_values() -> None:
    assert production_settings().is_production is True


def test_openai_provider_requires_server_side_key() -> None:
    with pytest.raises(ValidationError, match="OPENAI_API_KEY"):
        production_settings(ai_provider="openai")


def test_gemini_provider_requires_server_side_key() -> None:
    with pytest.raises(ValidationError, match="GEMINI_API_KEY"):
        production_settings(ai_provider="gemini")


def test_gemini_provider_requires_https_base_url_in_production() -> None:
    with pytest.raises(ValidationError, match="GEMINI_API_BASE_URL"):
        production_settings(
            ai_provider="gemini",
            gemini_api_key="a-google-ai-studio-key",
            gemini_api_base_url="http://generativelanguage.googleapis.com/v1beta",
        )


def test_gemini_provider_is_accepted_with_a_server_side_key() -> None:
    configured = production_settings(ai_provider="gemini", gemini_api_key="a-google-ai-studio-key")

    assert configured.ai_provider == "gemini"
    assert configured.ai_model == configured.gemini_model
    assert configured.ai_api_key is not None
    assert configured.ai_api_key.get_secret_value() == "a-google-ai-studio-key"


def test_ai_base_urls_must_be_http_urls() -> None:
    with pytest.raises(ValidationError, match="GEMINI_API_BASE_URL"):
        Settings(_env_file=None, gemini_api_base_url="file:///etc/passwd")


def test_bootstrap_owner_requires_both_email_and_password() -> None:
    with pytest.raises(ValidationError, match="BOOTSTRAP_OWNER_PASSWORD"):
        Settings(_env_file=None, bootstrap_owner_email="mayor@tripoli.gov.lb")


def test_bootstrap_owner_password_must_meet_the_password_policy() -> None:
    with pytest.raises(ValidationError, match="BOOTSTRAP_OWNER_PASSWORD"):
        Settings(
            _env_file=None,
            bootstrap_owner_email="mayor@tripoli.gov.lb",
            bootstrap_owner_password="short",
        )


def test_refresh_threshold_must_be_shorter_than_the_session_lifetime() -> None:
    with pytest.raises(ValidationError, match="AUTH_TOKEN_REFRESH_THRESHOLD_SECONDS"):
        Settings(_env_file=None, auth_token_ttl_seconds=600, auth_token_refresh_threshold_seconds=900)

import pytest
from pydantic import ValidationError

from app.core.config import LOCAL_AUTH_SECRET, Settings


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
        ({"ai_provider": "mock"}, "ai_provider"),
        ({"cors_origins": ["*"]}, "CORS_ORIGINS"),
        ({"cors_origins": ["http://citymind.example"]}, "CORS_ORIGINS"),
        ({"trusted_hosts": ["*"]}, "TRUSTED_HOSTS"),
    ],
)
def test_production_settings_reject_unsafe_values(override: dict[str, object], message: str) -> None:
    safe_values: dict[str, object] = {
        "app_env": "production",
        "auth_token_secret": "a-production-secret-that-is-longer-than-32-characters",
        "docs_enabled": False,
        "database_readiness_required": True,
        "database_url": "postgresql+psycopg://citymind:secure-password@db:5432/citymind",
        "scenario_persistence_backend": "database",
        "operational_persistence_backend": "database",
        "rate_limit_backend": "database",
        "ai_provider": "local_rag",
        "cors_origins": ["https://citymind.example"],
        "trusted_hosts": ["api.citymind.example"],
    }

    with pytest.raises(ValidationError, match=message):
        Settings(_env_file=None, **{**safe_values, **override})


def test_production_settings_accept_explicit_secure_values() -> None:
    production = Settings(
        _env_file=None,
        app_env="production",
        auth_token_secret="a-production-secret-that-is-longer-than-32-characters",
        docs_enabled=False,
        database_readiness_required=True,
        database_url="postgresql+psycopg://citymind:secure-password@db:5432/citymind",
        scenario_persistence_backend="database",
        operational_persistence_backend="database",
        rate_limit_backend="database",
        ai_provider="local_rag",
        cors_origins=["https://citymind.example"],
        trusted_hosts=["api.citymind.example"],
    )

    assert production.is_production is True


def test_openai_provider_requires_server_side_key() -> None:
    with pytest.raises(ValidationError, match="OPENAI_API_KEY"):
        Settings(
            _env_file=None,
            app_env="production",
            auth_token_secret="a-production-secret-that-is-longer-than-32-characters",
            docs_enabled=False,
            database_readiness_required=True,
            database_url="postgresql+psycopg://citymind:secure-password@db:5432/citymind",
            scenario_persistence_backend="database",
            operational_persistence_backend="database",
            rate_limit_backend="database",
            ai_provider="openai",
            cors_origins=["https://citymind.example"],
            trusted_hosts=["api.citymind.example"],
        )

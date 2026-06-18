from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    project_name: str = "CityMind Tripoli"
    city_name: str = "Tripoli"
    country_name: str = "Lebanon"
    app_env: str = "local"
    version: str = "0.1.0"
    service_name: str = "citymind-tripoli-api"
    database_url: str = "postgresql+psycopg://citymind:citymind@localhost:5432/citymind"
    cors_origins: list[str] = ["http://localhost:3000"]

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()


"""Application configuration settings."""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # API Settings
    api_title: str = "FastAPI Backend"
    api_version: str = "0.1.0"
    api_description: str = "FastAPI backend with Supabase PostgreSQL"

    # CORS (expects JSON array format in env: ["http://localhost:5173", "http://127.0.0.1:5173"])
    cors_origins: list[str] = ["http://localhost:5173"]

    # Supabase
    supabase_url: str = "http://localhost:54321"
    supabase_key: str = ""
    supabase_service_key: str = ""
    supabase_jwt_secret: str = ""

    # Database (Supabase local PostgreSQL)
    database_url: str = "postgresql://postgres:postgres@localhost:54322/postgres"

    # Material data processing config
    coverage_ratio_threshold: float = 1.3

    model_config = SettingsConfigDict(
        env_file=(".env.local", ".env"), env_file_encoding="utf-8", extra="ignore"
    )


# Global settings instance
settings = Settings()

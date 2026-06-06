"""Centralised settings loaded from environment variables."""

from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    GEMINI_API_KEY: str
    DATABASE_URL: str = "postgresql+asyncpg://hrms_user:pass@localhost:5432/hrms_db"
    REDIS_URL: str = "redis://localhost:6379"
    TEMPERATURE: float = 0.3
    MAX_TOKENS: int = 8192
    LOG_LEVEL: str = "INFO"
    MINIO_ENDPOINT: str = "localhost"
    MINIO_PORT: int = 9000
    MINIO_ACCESS_KEY: str = "minioadmin"
    MINIO_SECRET_KEY: str = "password123"
    MINIO_BUCKET_RESUMES: str = "resumes"

    class Config:
        env_file = ".env"
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()

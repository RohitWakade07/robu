import logging
import warnings
from functools import lru_cache
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict

logger = logging.getLogger(__name__)

_PLACEHOLDER_KEYS = {
    "change-me-in-production",
    "change-me-generate-with-openssl-rand-hex-32",
}


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    app_name: str = "Robu Warehouse Platform"
    app_version: str = "0.1.0"
    api_v1_prefix: str = "/api/v1"

    database_url: str = "postgresql+asyncpg://robu:robu_dev_password@localhost:5432/robu_warehouse"
    redis_url: str = "redis://localhost:6379/0"

    secret_key: str = "change-me-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7

    environment: str = "development"
    cors_origins: str = "http://localhost:5174,http://localhost:5173,http://localhost:3000"

    def model_post_init(self, __context: object) -> None:
        """Warn loudly if SECRET_KEY is still a placeholder value."""
        if self.secret_key in _PLACEHOLDER_KEYS:
            msg = (
                "SECRET_KEY is set to a placeholder value — all JWTs are insecure! "
                "Generate a real key with: openssl rand -hex 32"
            )
            if self.environment == "development":
                logger.warning(msg)
            else:
                # In staging/production this is a hard error, not just a warning
                raise ValueError(msg)

        if self.database_url.endswith("robu_dev_password@localhost:5432/robu_warehouse") and self.environment != "development":
            raise ValueError("DATABASE_URL is still the dev default — set a real value in production")

    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def is_development(self) -> bool:
        return self.environment == "development"


@lru_cache
def get_settings() -> Settings:
    return Settings()

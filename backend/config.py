import os
from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


def _resolve_db_url() -> str:
    """Check all env var names Vercel might use for a connected database."""
    for key in ("DATABASE_URL", "POSTGRES_URL_NON_POOLING", "POSTGRES_URL", "POSTGRES_PRISMA_URL", "SUPABASE_DB_URL"):
        val = os.environ.get(key, "")
        if val and not val.startswith("sqlite"):
            return val
    return "sqlite:///./lifestyle.db"


class Settings(BaseSettings):
    ANTHROPIC_API_KEY: str = ""
    SEARCH_API_KEY: str = ""
    BIBLE_API_KEY: str = ""
    SECRET_KEY: str = "changethissecretkeyinproduction"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 10080
    DATABASE_URL: str = ""
    PLAID_CLIENT_ID: str = ""
    PLAID_SECRET: str = ""
    PLAID_ENV: str = "sandbox"
    BIBLE_API_KEY: str = ""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @property
    def db_url(self) -> str:
        if self.DATABASE_URL and not self.DATABASE_URL.startswith("sqlite"):
            return self.DATABASE_URL
        return _resolve_db_url()


@lru_cache
def get_settings() -> Settings:
    return Settings()

from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    ANTHROPIC_API_KEY: str = ""
    WALMART_CLIENT_ID: str = ""
    WALMART_CLIENT_SECRET: str = ""          # raw PEM content (optional)
    WALMART_PRIVATE_KEY_PATH: str = ""       # path to .pem file (preferred)
    WALMART_API_BASE_URL: str = "https://developer.api.walmart.com/api-proxy/service/affil/product/v2"
    SECRET_KEY: str = "changethissecretkeyinproduction"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 10080
    DATABASE_URL: str = "sqlite:///./lifestyle.db"
    PLAID_CLIENT_ID: str = ""
    PLAID_SECRET: str = ""
    PLAID_ENV: str = "sandbox"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


@lru_cache
def get_settings() -> Settings:
    return Settings()

from urllib.parse import urlparse, urlunparse
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import NullPool
from .config import get_settings


def _clean_url(url: str) -> str:
    """Fix scheme and strip non-psycopg2 query params (e.g. Supabase's ?supa=...)."""
    url = url.replace("postgres://", "postgresql://", 1)
    if url.startswith("sqlite"):
        return url
    parsed = urlparse(url)
    return urlunparse((parsed.scheme, parsed.netloc, parsed.path, "", "", ""))


settings = get_settings()
_url = _clean_url(settings.db_url)

if _url.startswith("sqlite"):
    engine = create_engine(_url, connect_args={"check_same_thread": False})
else:
    # NullPool: don't keep connections open between serverless invocations
    engine = create_engine(_url, poolclass=NullPool, connect_args={"sslmode": "require"})

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

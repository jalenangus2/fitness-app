from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from .config import get_settings

settings = get_settings()
_url = settings.db_url.replace("postgres://", "postgresql://", 1)

if _url.startswith("sqlite"):
    _connect_args = {"check_same_thread": False}
elif "sslmode" in _url:
    _connect_args = {}  # SSL already in the URL
else:
    _connect_args = {"sslmode": "require"}

engine = create_engine(_url, connect_args=_connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

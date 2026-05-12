import re
import ssl

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

from .config import settings


def _build_engine():
    db_url = settings.database_url

    if db_url.startswith("sqlite"):
        return create_engine(
            db_url,
            connect_args={"check_same_thread": False},
            pool_pre_ping=True,
        )

    # Replace driver to use pg8000 (pure Python, works on Vercel)
    db_url = re.sub(r"^postgres(ql)?://", "postgresql+pg8000://", db_url)

    # Remove sslmode from URL — pg8000 uses ssl_context instead
    db_url = re.sub(r"[?&]sslmode=[^&]*", "", db_url)
    db_url = re.sub(r"[?&]$", "", db_url)

    ssl_ctx = ssl.create_default_context()
    ssl_ctx.check_hostname = False
    ssl_ctx.verify_mode = ssl.CERT_NONE

    return create_engine(
        db_url,
        connect_args={"ssl_context": ssl_ctx},
        pool_pre_ping=True,
    )


engine = _build_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

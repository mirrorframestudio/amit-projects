"""SQLite database setup with SQLAlchemy."""
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase

from . import config

engine = create_engine(
    config.DATABASE_URL,
    connect_args={"check_same_thread": False},  # SQLite specific
    echo=False,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    """Dependency: yield a DB session, auto-close."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def create_tables():
    """Create all tables (called on startup)."""
    Base.metadata.create_all(bind=engine)

"""
Database Configuration and Session Management
SQLAlchemy Async Engine with PostgreSQL and SQLite fallback
"""
import logging
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import declarative_base
from app.core.config import settings

logger = logging.getLogger("uvicorn.error")

Base = declarative_base()

# Determine connection URL: PostgreSQL default with fallback support
db_url = settings.DATABASE_URL
engine = None
async_session_factory = None


def setup_database_engine(url: str = None):
    global engine, async_session_factory, db_url
    target_url = url or settings.DATABASE_URL

    connect_args = {}
    if target_url.startswith("sqlite"):
        connect_args["check_same_thread"] = False

    engine = create_async_engine(
        target_url,
        echo=False,
        future=True,
        connect_args=connect_args
    )

    async_session_factory = async_sessionmaker(
        bind=engine,
        class_=AsyncSession,
        expire_on_commit=False,
        autocommit=False,
        autoflush=False
    )
    db_url = target_url
    return engine


# Initial setup
setup_database_engine()


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI Dependency for obtaining database session."""
    async with async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def init_db():
    """Initializes database tables, falling back to SQLite if PostgreSQL is unavailable."""
    global engine, async_session_factory, db_url
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        logger.info(f"Database initialized successfully with URL: {db_url.split('@')[-1]}")
    except Exception as exc:
        if settings.USE_SQLITE_FALLBACK and not db_url.startswith("sqlite"):
            logger.warning(
                f"PostgreSQL connection failed ({exc}). Falling back to SQLite for local development."
            )
            setup_database_engine(settings.SQLITE_URL)
            async with engine.begin() as conn:
                await conn.run_sync(Base.metadata.create_all)
            logger.info("SQLite fallback database initialized successfully.")
        else:
            logger.error(f"Failed to initialize database: {exc}")
            raise exc

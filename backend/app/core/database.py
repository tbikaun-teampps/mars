"""Database connection and session management using SQLModel."""

from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlmodel.ext.asyncio.session import AsyncSession as SQLModelAsyncSession

from app.core.config import settings

# Create async engine
# Convert postgresql:// to postgresql+asyncpg:// for async support
database_url = settings.database_url.replace(
    "postgresql://", "postgresql+asyncpg://"
)

engine = create_async_engine(
    database_url,
    echo=False,  # Set to True for SQL query logging
    future=True,
)

# Create async session factory
async_session_maker = sessionmaker(
    engine, class_=SQLModelAsyncSession, expire_on_commit=False
)


async def get_db() -> AsyncGenerator[SQLModelAsyncSession, None]:
    """FastAPI dependency to get database session.

    Yields:
        AsyncSession: SQLModel async session for database operations

    Example:
        ```python
        @router.get("/items")
        async def get_items(db: AsyncSession = Depends(get_db)):
            statement = select(Item)
            results = await db.exec(statement)
            return results.all()
        ```
    """
    async with async_session_maker() as session:
        yield session

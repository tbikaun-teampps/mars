"""Health check endpoints."""

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlmodel import text
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.database import get_db
from app.core.config import settings


router = APIRouter()


class DatabaseStatus(BaseModel):
    status: str
    url: str
    accessible: bool
    note: str | None = None


class HealthStatus(BaseModel):
    status: str
    message: str
    database: DatabaseStatus


@router.get("/health")
async def health_check(db: AsyncSession = Depends(get_db)) -> HealthStatus:
    """Health check endpoint with database connection status."""
    # Check database connection
    db_status = "unknown"
    db_accessible = False

    try:
        # Try to execute a simple query
        result = await db.exec(text("SELECT 1"))
        result.one()
        db_status = "connected"
        db_accessible = True
    except Exception as e:
        db_status = "error"
        db_accessible = False
        print(f"Database health check failed: {str(e)}")

    response = {
        "status": "healthy",
        "message": "API is running",
        "database": {
            "status": db_status,
            "url": (
                settings.database_url.replace(
                    settings.database_url.split("@")[0].split("//")[1], "***"
                )
                if "@" in settings.database_url
                else settings.database_url
            ),
            "accessible": db_accessible,
        },
    }

    # Add helpful messages based on status
    if db_status == "connected":
        response["database"]["note"] = "Database is connected and ready"
    elif db_status == "error":
        response["database"][
            "note"
        ] = "Database connection failed. Check configuration and ensure database is running."

    return response

"""FastAPI application entry point."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import health, materials, audit, reviews, comments, users, insights
from app.core.config import settings

# Create FastAPI app
app = FastAPI(
    title=settings.api_title,
    version=settings.api_version,
    description=settings.api_description,
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Include routers
app.include_router(health.router, prefix="/api", tags=["Health"])
app.include_router(materials.router, prefix="/api", tags=["Materials"])
app.include_router(reviews.router, prefix="/api", tags=["Material Reviews"])
app.include_router(comments.router, prefix="/api", tags=["Comments"])
app.include_router(audit.router, prefix="/api", tags=["Audit"])
app.include_router(users.router, prefix="/api", tags=["Users"])
app.include_router(insights.router, prefix="/api", tags=["Insights"])


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "message": "Welcome to the FastAPI backend",
        "docs": "/docs",
        "openapi": "/openapi.json",
    }

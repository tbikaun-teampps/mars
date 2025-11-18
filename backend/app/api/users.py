"""User endpoints."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.auth import get_current_user, User
from app.core.database import get_db
from app.models.db_models import ProfileDB
from app.models.user import UserResponse

router = APIRouter()


@router.get("/users/me", response_model=UserResponse)
async def get_current_user_profile(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> UserResponse:
    """Get current user's profile information."""

    # Query the profiles table to get full user information
    profile_query = select(ProfileDB).where(ProfileDB.id == current_user.id)
    profile_result = await db.exec(profile_query)
    profile = profile_result.first()

    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User profile not found",
        )

    return UserResponse(
        id=profile.id,
        email=current_user.email,
        full_name=profile.full_name,
    )

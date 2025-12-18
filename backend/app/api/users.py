"""User endpoints."""

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.api.rbac import check_user_is_admin, get_user_permissions
from app.core.auth import User, get_current_user
from app.core.database import get_db
from app.models.db_models import ProfileDB
from app.models.user import ProfileUpdate, UserResponse

router = APIRouter()


def _profile_to_response(profile: ProfileDB, email: str, is_admin: bool, permissions: list[str]) -> UserResponse:
    """Convert ProfileDB to UserResponse."""
    return UserResponse(
        id=profile.id,
        email=email,
        full_name=profile.full_name,
        display_name=profile.display_name,
        job_title=profile.job_title,
        department=profile.department,
        site=profile.site,
        phone=profile.phone,
        notification_preferences=profile.notification_preferences,
        is_admin=is_admin,
        permissions=permissions,
    )


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

    permissions = await get_user_permissions(current_user.id, db)
    is_admin = await check_user_is_admin(current_user.id, db)

    return _profile_to_response(profile, current_user.email, is_admin, permissions)


@router.put("/users/me", response_model=UserResponse)
async def update_current_user_profile(
    profile_update: ProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> UserResponse:
    """Update current user's profile information."""

    # Validate notification preferences - at least one must be enabled
    if profile_update.notification_preferences is not None:
        email = profile_update.notification_preferences.get("email", True)
        in_app = profile_update.notification_preferences.get("in_app", True)
        if not email and not in_app:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="At least one notification method must be enabled",
            )

    # Query the profiles table to get the user's profile
    profile_query = select(ProfileDB).where(ProfileDB.id == current_user.id)
    profile_result = await db.exec(profile_query)
    profile = profile_result.first()

    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User profile not found",
        )

    # Update only the fields that were provided
    update_data = profile_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(profile, field, value)

    # Update the updated_at timestamp
    profile.updated_at = datetime.now()

    db.add(profile)
    await db.commit()
    await db.refresh(profile)

    permissions = await get_user_permissions(current_user.id, db)
    is_admin = await check_user_is_admin(current_user.id, db)

    return _profile_to_response(profile, current_user.email, is_admin, permissions)

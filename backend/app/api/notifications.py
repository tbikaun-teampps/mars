"""Notification endpoints."""

from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import update
from sqlmodel import func, select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.auth import User, get_current_user
from app.core.config import settings
from app.core.database import get_db
from app.models.db_models import NotificationDB, ProfileDB
from app.models.notification import (
    DebugNotificationCreate,
    NotificationPreferences,
    NotificationPreferencesUpdate,
    NotificationResponse,
    NotificationType,
    PaginatedNotificationsResponse,
)
from app.models.user import UserProfile

router = APIRouter()


@router.get("/notifications", response_model=PaginatedNotificationsResponse)
async def list_notifications(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    unread_only: bool = Query(False),
) -> PaginatedNotificationsResponse:
    """List current user's notifications with pagination."""
    user_id = UUID(current_user.id)

    # Build query with profile join for triggered_by user
    query = (
        select(NotificationDB, ProfileDB).where(NotificationDB.user_id == user_id).outerjoin(ProfileDB, NotificationDB.triggered_by == ProfileDB.id)
    )

    if unread_only:
        query = query.where(NotificationDB.is_read.is_(False))

    # Get total count
    count_query = select(func.count()).select_from(NotificationDB).where(NotificationDB.user_id == user_id)
    if unread_only:
        count_query = count_query.where(NotificationDB.is_read.is_(False))

    total_result = await db.exec(count_query)
    total = total_result.one()

    # Get unread count (always return this regardless of filter)
    unread_count_query = (
        select(func.count())
        .select_from(NotificationDB)
        .where(
            NotificationDB.user_id == user_id,
            NotificationDB.is_read.is_(False),
        )
    )
    unread_result = await db.exec(unread_count_query)
    unread_count = unread_result.one()

    # Apply ordering and pagination
    query = query.order_by(NotificationDB.created_at.desc())
    query = query.offset(skip).limit(limit)

    results = await db.exec(query)
    notifications_data = results.all()

    # Transform to response models
    items = [
        NotificationResponse(
            notification_id=notification.notification_id,
            user_id=notification.user_id,
            notification_type=NotificationType(notification.notification_type),
            title=notification.title,
            message=notification.message,
            review_id=notification.review_id,
            material_number=notification.material_number,
            comment_id=notification.comment_id,
            triggered_by=notification.triggered_by,
            triggered_by_user=(UserProfile(id=profile.id, full_name=profile.full_name) if profile else None),
            is_read=notification.is_read,
            read_at=notification.read_at,
            created_at=notification.created_at,
        )
        for notification, profile in notifications_data
    ]

    return PaginatedNotificationsResponse(
        items=items,
        total=total,
        unread_count=unread_count,
        skip=skip,
        limit=limit,
    )


@router.get("/notifications/unread-count")
async def get_unread_count(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Get unread notification count for badge."""
    user_id = UUID(current_user.id)

    count_query = (
        select(func.count())
        .select_from(NotificationDB)
        .where(
            NotificationDB.user_id == user_id,
            NotificationDB.is_read.is_(False),
        )
    )
    result = await db.exec(count_query)
    count = result.one()

    return {"unread_count": count}


@router.put("/notifications/{notification_id}/read")
async def mark_as_read(
    notification_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Mark a notification as read."""
    user_id = UUID(current_user.id)

    query = select(NotificationDB).where(
        NotificationDB.notification_id == notification_id,
        NotificationDB.user_id == user_id,
    )
    result = await db.exec(query)
    notification = result.first()

    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")

    notification.is_read = True
    notification.read_at = datetime.now()

    db.add(notification)
    await db.commit()

    return {"message": "Notification marked as read"}


@router.put("/notifications/{notification_id}/unread")
async def mark_as_unread(
    notification_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Mark a notification as unread."""
    user_id = UUID(current_user.id)

    query = select(NotificationDB).where(
        NotificationDB.notification_id == notification_id,
        NotificationDB.user_id == user_id,
    )
    result = await db.exec(query)
    notification = result.first()

    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")

    notification.is_read = False
    notification.read_at = None

    db.add(notification)
    await db.commit()

    return {"message": "Notification marked as unread"}


@router.put("/notifications/mark-all-read")
async def mark_all_as_read(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Mark all notifications as read."""
    user_id = UUID(current_user.id)

    stmt = (
        update(NotificationDB)
        .where(
            NotificationDB.user_id == user_id,
            NotificationDB.is_read.is_(False),
        )
        .values(is_read=True, read_at=datetime.now())
    )

    await db.exec(stmt)
    await db.commit()

    return {"message": "All notifications marked as read"}


@router.get("/notifications/preferences", response_model=NotificationPreferences)
async def get_notification_preferences(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> NotificationPreferences:
    """Get current user's notification preferences."""
    user_id = UUID(current_user.id)

    query = select(ProfileDB).where(ProfileDB.id == user_id)
    result = await db.exec(query)
    profile = result.first()

    # Default preferences (all enabled)
    default_prefs = NotificationPreferences()

    if profile and profile.notification_preferences:
        # Merge stored preferences with defaults
        return NotificationPreferences(
            **{
                **default_prefs.model_dump(),
                **profile.notification_preferences,
            }
        )

    return default_prefs


@router.put("/notifications/preferences", response_model=NotificationPreferences)
async def update_notification_preferences(
    preferences: NotificationPreferencesUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> NotificationPreferences:
    """Update current user's notification preferences."""
    user_id = UUID(current_user.id)

    query = select(ProfileDB).where(ProfileDB.id == user_id)
    result = await db.exec(query)
    profile = result.first()

    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    # Merge with existing preferences
    current_prefs = profile.notification_preferences or {}
    update_data = preferences.model_dump(exclude_unset=True)

    profile.notification_preferences = {**current_prefs, **update_data}

    db.add(profile)
    await db.commit()
    await db.refresh(profile)

    return NotificationPreferences(**profile.notification_preferences)


@router.post("/notifications/debug/create", response_model=NotificationResponse)
async def create_debug_notification(
    data: DebugNotificationCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> NotificationResponse:
    """Create a test notification (debug mode only)."""
    if not settings.debug_mode:
        raise HTTPException(status_code=403, detail="Debug mode is not enabled")

    user_id = UUID(current_user.id)

    # Generate default title/message if not provided
    type_label = data.notification_type.value.replace("_", " ").title()
    title = data.title or f"Test: {type_label}"
    message = data.message or f"This is a test notification of type '{data.notification_type.value}'."

    # Create notification
    notification = NotificationDB(
        user_id=user_id,
        notification_type=data.notification_type.value,
        title=title,
        message=message,
        material_number=data.material_number,
    )

    db.add(notification)
    await db.commit()
    await db.refresh(notification)

    return NotificationResponse(
        notification_id=notification.notification_id,
        user_id=notification.user_id,
        notification_type=data.notification_type,
        title=notification.title,
        message=notification.message,
        material_number=notification.material_number,
        is_read=notification.is_read,
        created_at=notification.created_at,
    )

"""Notification models."""

from datetime import datetime
from enum import Enum
from typing import Optional
from uuid import UUID

from pydantic import BaseModel

from app.models.user import UserProfile


class NotificationType(str, Enum):
    """Notification type options."""

    REVIEW_ASSIGNED = "review_assigned"
    REVIEW_STATUS_CHANGED = "review_status_changed"
    COMMENT_ADDED = "comment_added"


class NotificationResponse(BaseModel):
    """Notification response model."""

    notification_id: int
    user_id: UUID
    notification_type: NotificationType
    title: str
    message: str
    review_id: Optional[int] = None
    material_number: Optional[int] = None
    comment_id: Optional[int] = None
    triggered_by: Optional[UUID] = None
    triggered_by_user: Optional[UserProfile] = None
    is_read: bool
    read_at: Optional[datetime] = None
    created_at: datetime


class PaginatedNotificationsResponse(BaseModel):
    """Paginated notifications response."""

    items: list[NotificationResponse]
    total: int
    unread_count: int
    skip: int
    limit: int


class NotificationPreferences(BaseModel):
    """User notification preferences."""

    review_assigned: bool = True
    review_status_changed: bool = True
    comment_added: bool = True


class NotificationPreferencesUpdate(BaseModel):
    """Schema for updating notification preferences."""

    review_assigned: Optional[bool] = None
    review_status_changed: Optional[bool] = None
    comment_added: Optional[bool] = None

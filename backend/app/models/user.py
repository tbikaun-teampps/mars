"""User models and schemas."""

from pydantic import BaseModel, EmailStr
from uuid import UUID
from typing import Optional

class UserProfile(BaseModel):
    """User profile information."""

    id: UUID
    full_name: Optional[str] = None


class UserResponse(BaseModel):
    """User response schema."""

    id: UUID
    email: EmailStr
    full_name: str | None = None
    display_name: str | None = None
    job_title: str | None = None
    department: str | None = None
    site: str | None = None
    phone: str | None = None
    notification_preferences: Optional[dict] = None
    is_admin: bool = False
    permissions: list[str] = []


class ProfileUpdate(BaseModel):
    """Schema for updating user profile."""

    display_name: str | None = None
    phone: str | None = None
    notification_preferences: Optional[dict] = None


class CurrentUser(BaseModel):
    """Current authenticated user schema."""

    id: str
    email: str

    class Config:
        """Pydantic config."""

        from_attributes = True

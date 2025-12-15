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
    is_admin: bool = False


class CurrentUser(BaseModel):
    """Current authenticated user schema."""

    id: str
    email: str

    class Config:
        """Pydantic config."""

        from_attributes = True

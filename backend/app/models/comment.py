"""Review comment models."""

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel

from app.models.user import UserProfile


class ReviewComment(BaseModel):
    """Review comment model."""

    comment_id: int
    review_id: int
    user_id: UUID
    comment: str
    created_at: datetime
    updated_at: datetime


class ReviewCommentCreate(BaseModel):
    """Schema for creating a new comment."""

    comment: str


class ReviewCommentResponse(BaseModel):
    """Review comment response with user information."""

    comment_id: int
    review_id: int
    user_id: UUID
    comment: str
    created_at: datetime
    updated_at: datetime
    user: Optional[UserProfile] = None


class PaginatedReviewCommentsResponse(BaseModel):
    """Paginated review comments response."""

    items: list[ReviewCommentResponse]
    total: int
    skip: int
    limit: int

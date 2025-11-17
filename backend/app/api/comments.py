"""Review comment endpoints."""

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import select, func
from sqlmodel.ext.asyncio.session import AsyncSession

from app.models.comment import (
    ReviewCommentCreate,
    ReviewCommentResponse,
    PaginatedReviewCommentsResponse,
)
from app.models.db_models import ReviewCommentDB, ProfileDB, MaterialReviewDB
from app.models.user import UserProfile
from app.core.database import get_db
from app.core.auth import get_current_user, User

router = APIRouter()


@router.get("/materials/{material_number}/review/{review_id}/comments")
async def list_review_comments(
    material_number: int,
    review_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    skip: int = Query(0, ge=0, description="Number of items to skip"),
    limit: int = Query(
        50, ge=1, le=500, description="Maximum number of items to return"
    ),
) -> PaginatedReviewCommentsResponse:
    """List comments for a specific review with pagination."""

    # Verify the review exists and belongs to the material
    review_query = select(MaterialReviewDB).where(
        MaterialReviewDB.review_id == review_id,
        MaterialReviewDB.material_number == material_number
    )
    review_result = await db.exec(review_query)
    review = review_result.first()

    if not review:
        raise HTTPException(status_code=404, detail="Review not found")

    # Build query for comments with user profile join
    query = (
        select(ReviewCommentDB, ProfileDB)
        .where(ReviewCommentDB.review_id == review_id)
        .outerjoin(ProfileDB, ReviewCommentDB.user_id == ProfileDB.id)
    )

    # Get total count
    count_query = select(func.count()).select_from(ReviewCommentDB).where(
        ReviewCommentDB.review_id == review_id
    )
    total_result = await db.exec(count_query)
    total = total_result.one()

    # Apply sorting (newest first)
    query = query.order_by(ReviewCommentDB.created_at.desc())

    # Apply pagination
    query = query.offset(skip).limit(limit)

    # Execute query
    results = await db.exec(query)
    comments_data = results.all()

    # Transform to response models
    comments = [
        ReviewCommentResponse(
            comment_id=comment.comment_id,
            review_id=comment.review_id,
            user_id=comment.user_id,
            comment=comment.comment,
            created_at=comment.created_at,
            updated_at=comment.updated_at,
            user=UserProfile(id=profile.id, full_name=profile.full_name) if profile else None,
        )
        for comment, profile in comments_data
    ]

    return PaginatedReviewCommentsResponse(
        items=comments,
        total=total,
        skip=skip,
        limit=limit,
    )


@router.post("/materials/{material_number}/review/{review_id}/comments")
async def create_review_comment(
    material_number: int,
    review_id: int,
    comment_data: ReviewCommentCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ReviewCommentResponse:
    """Create a new comment on a review."""

    # Verify the review exists and belongs to the material
    review_query = select(MaterialReviewDB).where(
        MaterialReviewDB.review_id == review_id,
        MaterialReviewDB.material_number == material_number
    )
    review_result = await db.exec(review_query)
    review = review_result.first()

    if not review:
        raise HTTPException(status_code=404, detail="Review not found")

    # Create the comment
    new_comment = ReviewCommentDB(
        review_id=review_id,
        user_id=current_user.id,
        comment=comment_data.comment,
    )

    db.add(new_comment)
    await db.commit()
    await db.refresh(new_comment)

    # Fetch the user profile for the response
    profile_query = select(ProfileDB).where(ProfileDB.id == current_user.id)
    profile_result = await db.exec(profile_query)
    profile = profile_result.first()

    return ReviewCommentResponse(
        comment_id=new_comment.comment_id,
        review_id=new_comment.review_id,
        user_id=new_comment.user_id,
        comment=new_comment.comment,
        created_at=new_comment.created_at,
        updated_at=new_comment.updated_at,
        user=UserProfile(id=profile.id, full_name=profile.full_name) if profile else None,
    )


@router.delete("/comments/{comment_id}")
async def delete_review_comment(
    comment_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Delete a comment. Users can only delete their own comments."""

    # Fetch the comment
    comment_query = select(ReviewCommentDB).where(
        ReviewCommentDB.comment_id == comment_id
    )
    comment_result = await db.exec(comment_query)
    comment = comment_result.first()

    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")

    # Check if the current user is the owner of the comment
    if str(comment.user_id) != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="You can only delete your own comments"
        )

    # Delete the comment
    await db.delete(comment)
    await db.commit()

    return {"message": "Comment deleted successfully"}

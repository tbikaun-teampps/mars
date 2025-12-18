"""Material reviews endpoints."""

from datetime import datetime
from uuid import UUID

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
)
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.api.rbac import check_user_is_admin, has_permission, require_permission
from app.core.auth import User, get_current_user
from app.core.database import get_db
from app.models.db_models import MaterialReviewDB, ReviewAssignmentDB, SAPMaterialData
from app.models.review import (
    MaterialReview,
    MaterialReviewCreate,
    MaterialReviewUpdate,
    ReviewStatus,
    ReviewStepEnum,
)
from app.services.review_service import ReviewService

router = APIRouter()


async def validate_assignee(
    user_id: str,
    review_id: int,
    assignment_type: str,
    db: AsyncSession,
) -> None:
    """Validate user is the assigned person for this step. Admins bypass.

    Args:
        user_id: Current user's ID
        review_id: The review being updated
        assignment_type: 'sme' or 'approver'
        db: Database session

    Raises:
        HTTPException 403 if user is not assigned
    """
    from uuid import UUID

    # Check if admin first - admins bypass assignee check
    is_admin = await check_user_is_admin(user_id, db)
    if is_admin:
        return

    # Check assignment
    query = select(ReviewAssignmentDB).where(
        ReviewAssignmentDB.review_id == review_id,
        ReviewAssignmentDB.assignment_type == assignment_type,
        ReviewAssignmentDB.user_id == UUID(user_id),
        ReviewAssignmentDB.status.notin_(["declined", "reassigned"]),
    )
    result = await db.exec(query)
    assignment = result.first()

    if not assignment:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"You are not assigned as the {assignment_type} for this review",
        )


async def check_review_access(
    user_id: str,
    review: MaterialReviewDB,
    db: AsyncSession,
) -> str:
    """Check if user can access review and return their role.

    Access is granted to:
    - Admins (role: 'admin')
    - Users with 'can_view_all_reviews' permission (role: 'viewer')
    - The review initiator (role: 'initiator')
    - Assigned SME (role: 'sme')
    - Assigned approver (role: 'approver')

    Args:
        user_id: Current user's ID
        review: The review being accessed
        db: Database session

    Returns:
        The user's role string

    Raises:
        HTTPException 403 if user is not authorized to access this review
    """
    user_uuid = UUID(user_id)

    # Check if admin first
    if await check_user_is_admin(user_id, db):
        return "admin"

    # Check can_view_all_reviews permission
    if await has_permission(user_id, db, "can_view_all_reviews"):
        return "viewer"

    # Check if user is the initiator
    if review.initiated_by == user_uuid:
        return "initiator"

    # Check if user is assigned as SME or approver
    query = select(ReviewAssignmentDB).where(
        ReviewAssignmentDB.review_id == review.review_id,
        ReviewAssignmentDB.user_id == user_uuid,
        ReviewAssignmentDB.status.notin_(["declined", "reassigned"]),
    )
    result = await db.exec(query)
    assignment = result.first()

    if assignment:
        return assignment.assignment_type  # 'sme' or 'approver'

    # User is not authorized
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="You don't have access to this review",
    )


@router.get("/materials/{material_number}/reviews/{review_id}", status_code=status.HTTP_200_OK)
async def get_review(
    material_number: int,
    review_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> MaterialReview:
    """Get a single review with full details."""

    # Verify that the material exists
    material_query = select(SAPMaterialData).where(SAPMaterialData.material_number == material_number)
    material_result = await db.exec(material_query)
    material_exists = material_result.first()

    if not material_exists:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Material {material_number} not found",
        )

    # Fetch the review
    review_query = select(MaterialReviewDB).where(
        MaterialReviewDB.review_id == review_id,
        MaterialReviewDB.material_number == material_number,
    )
    review_result = await db.exec(review_query)
    review_db = review_result.first()

    if not review_db:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Review {review_id} not found for material {material_number}",
        )

    # Check access and get user's role
    user_role = await check_review_access(current_user.id, review_db, db)

    # Use ReviewService to build the response with all enrichments
    review_service = ReviewService(db)
    return await review_service.build_review_response(review_db, user_role=user_role)


@router.post("/materials/{material_number}/review", status_code=status.HTTP_201_CREATED)
async def create_material_review(
    material_number: int,
    review_data: MaterialReviewCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> MaterialReview:
    """Create a new review for a material."""

    # Permission check: require can_create_reviews
    await require_permission(current_user.id, db, "can_create_reviews")

    # Verify that the material exists
    material_query = select(SAPMaterialData).where(SAPMaterialData.material_number == material_number)
    material_result = await db.exec(material_query)
    material_exists = material_result.first()

    if not material_exists:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Material {material_number} not found",
        )

    # Use ReviewService for all business logic
    review_service = ReviewService(db)

    # Block a new review if there are any that exist which are not in a terminal state
    await review_service.validate_no_active_review(material_number)

    # Create the review
    review_db = await review_service.create_review(
        material_number=material_number,
        review_data=review_data,
        user_id=current_user.id,
        current_stock_qty=material_exists.total_quantity,
        current_stock_value=material_exists.total_value,
    )

    # Build the response with all enrichments
    return await review_service.build_review_response(review_db)


@router.put("/materials/{material_number}/review/{review_id}", status_code=status.HTTP_200_OK)
async def update_material_review(
    material_number: int,
    review_id: int,
    step: ReviewStepEnum,
    review_data: MaterialReviewUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> MaterialReview:
    """Update an existing review for a material."""

    # Permission check: require can_edit_reviews
    await require_permission(current_user.id, db, "can_edit_reviews")

    # Step-specific permission and assignee checks
    if step == ReviewStepEnum.SME_INVESTIGATION:
        await require_permission(current_user.id, db, "can_provide_sme_review")
        # Validate user is the assigned SME
        await validate_assignee(current_user.id, review_id, "sme", db)
    elif step == ReviewStepEnum.FINAL_DECISION:
        await require_permission(current_user.id, db, "can_approve_reviews")
        # Validate user is the assigned approver
        await validate_assignee(current_user.id, review_id, "approver", db)

    # Verify that the material exists
    material_query = select(SAPMaterialData).where(SAPMaterialData.material_number == material_number)
    material_result = await db.exec(material_query)
    material_exists = material_result.first()

    if not material_exists:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Material {material_number} not found",
        )

    # Verify that the review exists and belongs to this material
    review_query = select(MaterialReviewDB).where(
        MaterialReviewDB.review_id == review_id,
        MaterialReviewDB.material_number == material_number,
    )
    review_result = await db.exec(review_query)
    review_db = review_result.first()

    if not review_db:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Review {review_id} not found for material {material_number}",
        )

    # Use ReviewService for all business logic
    review_service = ReviewService(db)

    # Block edits if status is in a terminal state (approved, rejected, cancelled)
    review_service.validate_can_edit(review_db)

    # Get update data and delegate to service
    update_data = review_data.model_dump(exclude_unset=True)

    # Update the review using the service
    review_db = await review_service.update_review_step(
        review_db=review_db,
        step=step.value,
        update_data=update_data,
        user_id=current_user.id,
    )

    # Build the response with all enrichments
    return await review_service.build_review_response(review_db)


@router.put(
    "/materials/{material_number}/review/{review_id}/cancel",
    status_code=status.HTTP_200_OK,
)
async def cancel_material_review(
    material_number: int,
    review_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Cancel a review for a material."""

    # Permission check: require can_delete_reviews
    await require_permission(current_user.id, db, "can_delete_reviews")

    # Verify that the material exists
    material_query = select(SAPMaterialData).where(SAPMaterialData.material_number == material_number)
    material_result = await db.exec(material_query)
    material_exists = material_result.first()

    if not material_exists:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Material {material_number} not found",
        )

    # Verify that the review exists and belongs to this material
    review_query = select(MaterialReviewDB).where(
        MaterialReviewDB.review_id == review_id,
        MaterialReviewDB.material_number == material_number,
    )
    review_result = await db.exec(review_query)
    review_db = review_result.first()

    if not review_db:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Review {review_id} not found for material {material_number}",
        )

    # Update status to cancelled
    review_db.status = ReviewStatus.CANCELLED.value

    # Update last_updated_by and updated_at
    review_db.last_updated_by = current_user.id
    review_db.updated_at = datetime.now()

    # Save to database
    try:
        db.add(review_db)
        await db.commit()
        await db.refresh(review_db)
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to cancel review: {str(e)}",
        )

    return {
        "message": f"Review {review_id} for material {material_number} cancelled successfully",
        "review_id": review_id,
        "material_number": material_number,
    }

"""Material reviews endpoints."""

from datetime import date, datetime
from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
)
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.models.review import (
    MaterialReview,
    MaterialReviewCreate,
    MaterialReviewUpdate,
    ReviewStepEnum,
    ReviewStatus,
    ReviewChecklist
)
from app.models.user import UserProfile
from app.models.db_models import SAPMaterialData, MaterialReviewDB, ProfileDB, ReviewCommentDB
from app.core.database import get_db
from sqlmodel import func
from app.core.auth import get_current_user, User
from app.api.utils import determine_status_after_step

router = APIRouter()


@router.post("/materials/{material_number}/review", status_code=status.HTTP_201_CREATED)
async def create_material_review(
    material_number: int,
    review_data: MaterialReviewCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> MaterialReview:
    """Create a new review for a material."""

    # Verify that the material exists
    material_query = select(SAPMaterialData).where(
        SAPMaterialData.material_number == material_number
    )
    material_result = await db.exec(material_query)
    material_exists = material_result.first()

    if not material_exists:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Material {material_number} not found",
        )

    # Block a new review if there are any that exist which are not either
    # completed or cancelled
    existing_review_query = select(MaterialReviewDB).where(
        MaterialReviewDB.material_number == material_number,
        MaterialReviewDB.status.notin_(["completed", "cancelled"]),
    )
    existing_review_result = await db.exec(existing_review_query)
    existing_review = existing_review_result.first()

    if existing_review:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An active review already exists for this material. A new review cannot be created until the existing one is completed or cancelled.",
        )

    # Create the review database record
    review_db = MaterialReviewDB(
        created_by=current_user.id,
        last_updated_by=current_user.id,
        material_number=material_number,
        initiated_by=current_user.id,
        review_date=date.today(),
        review_reason=review_data.review_reason,
        current_stock_qty=review_data.current_stock_qty,
        current_stock_value=review_data.current_stock_value,
        months_no_movement=review_data.months_no_movement,
        proposed_action=review_data.proposed_action,
        proposed_qty_adjustment=review_data.proposed_qty_adjustment,
        business_justification=review_data.business_justification,
        sme_name=review_data.sme_name,
        sme_email=review_data.sme_email,
        sme_department=review_data.sme_department,
        sme_feedback_method=review_data.sme_feedback_method,
        sme_contacted_date=review_data.sme_contacted_date,
        sme_responded_date=review_data.sme_responded_date,
        sme_recommendation=review_data.sme_recommendation,
        sme_recommended_qty=review_data.sme_recommended_qty,
        sme_analysis=review_data.sme_analysis,
        alternative_applications=review_data.alternative_applications,
        risk_assessment=review_data.risk_assessment,
        final_decision=review_data.final_decision,
        final_qty_adjustment=review_data.final_qty_adjustment,
        final_notes=review_data.final_notes,
        requires_follow_up=review_data.requires_follow_up,
        next_review_date=review_data.next_review_date,
        follow_up_reason=review_data.follow_up_reason,
        review_frequency_weeks=review_data.review_frequency_weeks,
        previous_review_id=review_data.previous_review_id,
        estimated_savings=review_data.estimated_savings,
        implementation_date=review_data.implementation_date,
        status="draft",
    )

    # Save to database
    try:
        db.add(review_db)
        await db.commit()
        await db.refresh(review_db)
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save review: {str(e)}",
        )

    # Fetch initiator profile
    initiator_profile_query = select(ProfileDB).where(
        ProfileDB.id == review_db.initiated_by
    )
    initiator_profile_result = await db.exec(initiator_profile_query)
    initiator_profile = initiator_profile_result.first()

    # Create user profile object if profile exists
    initiated_by_user = None
    if initiator_profile:
        initiated_by_user = UserProfile(
            id=initiator_profile.id, full_name=initiator_profile.full_name
        )

    return MaterialReview(
        created_by=review_db.created_by,
        last_updated_by=review_db.last_updated_by,
        review_id=review_db.review_id,
        material_number=review_db.material_number,
        initiated_by=review_db.initiated_by,
        initiated_by_user=initiated_by_user,
        review_date=review_db.review_date,
        review_reason=review_db.review_reason,
        current_stock_qty=review_db.current_stock_qty,
        current_stock_value=review_db.current_stock_value,
        months_no_movement=review_db.months_no_movement,
        proposed_action=review_db.proposed_action,
        proposed_qty_adjustment=review_db.proposed_qty_adjustment,
        business_justification=review_db.business_justification,
        sme_name=review_db.sme_name,
        sme_email=review_db.sme_email,
        sme_department=review_db.sme_department,
        sme_feedback_method=review_db.sme_feedback_method,
        sme_contacted_date=review_db.sme_contacted_date,
        sme_responded_date=review_db.sme_responded_date,
        sme_recommendation=review_db.sme_recommendation,
        sme_recommended_qty=review_db.sme_recommended_qty,
        sme_analysis=review_db.sme_analysis,
        alternative_applications=review_db.alternative_applications,
        risk_assessment=review_db.risk_assessment,
        final_decision=review_db.final_decision,
        final_qty_adjustment=review_db.final_qty_adjustment,
        final_notes=review_db.final_notes,
        decided_by=review_db.decided_by,
        decided_by_user=None,  # New review, no decider yet
        decided_at=review_db.decided_at,
        requires_follow_up=review_db.requires_follow_up,
        next_review_date=review_db.next_review_date,
        follow_up_reason=review_db.follow_up_reason,
        review_frequency_weeks=review_db.review_frequency_weeks,
        previous_review_id=review_db.previous_review_id,
        estimated_savings=review_db.estimated_savings,
        implementation_date=review_db.implementation_date,
        status=review_db.status,
        completed_checklist=review_db.completed_checklist,
        created_at=review_db.created_at,
        updated_at=review_db.updated_at,
        comments_count=0  # New review has no comments yet
    )


@router.put(
    "/materials/{material_number}/review/{review_id}", status_code=status.HTTP_200_OK
)
async def update_material_review(
    material_number: int,
    review_id: int,
    step: ReviewStepEnum,
    review_data: MaterialReviewUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> MaterialReview:
    """Update an existing review for a material."""

    # Verify that the material exists
    material_query = select(SAPMaterialData).where(
        SAPMaterialData.material_number == material_number
    )
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

    # Block edits if status is completed or cancelled
    if review_db.status in ["completed", "cancelled"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Cannot edit review with status '{review_db.status}'. Review is locked.",
        )

    # Get update data
    update_data = review_data.model_dump(exclude_unset=True)

    # Step 2 Special Handling: Save checklist data to review_checklist table
    if step == ReviewStepEnum.CHECKLIST:
        from app.models.db_models import ReviewChecklistDB

        print(f"update_data: {update_data}")

        # Extract checklist fields from update_data
        checklist_fields = [
            "has_open_orders",
            "has_forecast_demand",
            "checked_alternate_plants",
            "contacted_procurement",
            "reviewed_bom_usage",
            "checked_supersession",
            "checked_historical_usage",
            "open_order_numbers",
            "forecast_next_12m",
            "alternate_plant_qty",
            "procurement_feedback",
        ]

        checklist_data = {k: v for k, v in update_data.items() if k in checklist_fields}

        # Validate that all required boolean fields are present
        required_checks = [
            "has_open_orders",
            "has_forecast_demand",
            "checked_alternate_plants",
            "contacted_procurement",
            "reviewed_bom_usage",
            "checked_supersession",
            "checked_historical_usage",
        ]
        missing_fields = [f for f in required_checks if f not in checklist_data]
        if missing_fields:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Checklist step requires all boolean fields: {missing_fields}. You provided: {list(checklist_data.keys())}",
            )

        # Upsert checklist data
        checklist_query = select(ReviewChecklistDB).where(
            ReviewChecklistDB.review_id == review_id
        )
        checklist_result = await db.exec(checklist_query)
        existing_checklist = checklist_result.first()

        if existing_checklist:

            # Update existing checklist
            for field, value in checklist_data.items():
                setattr(existing_checklist, field, value)
            existing_checklist.last_updated_by = current_user.id
            existing_checklist.updated_at = datetime.now()
            db.add(existing_checklist)
        else:
            # Create new checklist
            new_checklist = ReviewChecklistDB(review_id=review_id, **checklist_data, created_by=current_user.id, last_updated_by=current_user.id)
            db.add(new_checklist)

        # Mark checklist as completed on the review
        review_db.completed_checklist = True

        # Remove checklist fields from update_data so they don't get applied to review
        for field in checklist_fields:
            update_data.pop(field, None)

    # Update review fields (partial update - only fields provided)
    for field, value in update_data.items():
        if hasattr(review_db, field):
            setattr(review_db, field, value)

    # Auto-clear follow-up fields when requires_follow_up is set to false
    if 'requires_follow_up' in update_data and update_data['requires_follow_up'] is False:
        review_db.next_review_date = None
        review_db.follow_up_reason = None
        review_db.review_frequency_weeks = None

    # Determine and update status based on step completion
    new_status = determine_status_after_step(step, review_db, update_data)
    review_db.status = new_status

    # Auto-set decided_by and decided_at when status becomes completed
    if new_status == ReviewStatus.COMPLETED.value and not review_db.decided_at:
        review_db.decided_at = datetime.now()
        if not review_db.decided_by:
            review_db.decided_by = current_user.id

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
            detail=f"Failed to update review: {str(e)}",
        )

    # Query checklist data if it exists
    from app.models.db_models import ReviewChecklistDB

    checklist_query = select(ReviewChecklistDB).where(
        ReviewChecklistDB.review_id == review_id
    )
    checklist_result = await db.exec(checklist_query)
    checklist_db = checklist_result.first()

    # Create ReviewChecklist object if data exists
    checklist = None
    if checklist_db:
        checklist = ReviewChecklist(
            has_open_orders=checklist_db.has_open_orders,
            has_forecast_demand=checklist_db.has_forecast_demand,
            checked_alternate_plants=checklist_db.checked_alternate_plants,
            contacted_procurement=checklist_db.contacted_procurement,
            reviewed_bom_usage=checklist_db.reviewed_bom_usage,
            checked_supersession=checklist_db.checked_supersession,
            checked_historical_usage=checklist_db.checked_historical_usage,
            open_order_numbers=checklist_db.open_order_numbers,
            forecast_next_12m=checklist_db.forecast_next_12m,
            alternate_plant_qty=checklist_db.alternate_plant_qty,
            procurement_feedback=checklist_db.procurement_feedback,
        )

    # Fetch initiator and decider profiles
    initiator_profile_query = select(ProfileDB).where(
        ProfileDB.id == review_db.initiated_by
    )
    initiator_profile_result = await db.exec(initiator_profile_query)
    initiator_profile = initiator_profile_result.first()

    # Create initiator user profile object if profile exists
    initiated_by_user = None
    if initiator_profile:
        initiated_by_user = UserProfile(
            id=initiator_profile.id, full_name=initiator_profile.full_name
        )

    # Fetch decider profile if decided_by is set
    decided_by_user = None
    if review_db.decided_by:
        decider_profile_query = select(ProfileDB).where(
            ProfileDB.id == review_db.decided_by
        )
        decider_profile_result = await db.exec(decider_profile_query)
        decider_profile = decider_profile_result.first()

        if decider_profile:
            decided_by_user = UserProfile(
                id=decider_profile.id, full_name=decider_profile.full_name
            )

    # Get comment count for this review
    comments_count_query = select(func.count(ReviewCommentDB.comment_id)).where(
        ReviewCommentDB.review_id == review_db.review_id
    )
    comments_count_result = await db.exec(comments_count_query)
    comments_count = comments_count_result.one() or 0

    # Return as MaterialReview response model
    return MaterialReview(
        created_by=review_db.created_by,
        last_updated_by=review_db.last_updated_by,
        review_id=review_db.review_id,
        material_number=review_db.material_number,
        initiated_by=review_db.initiated_by,
        initiated_by_user=initiated_by_user,
        review_date=review_db.review_date,
        review_reason=review_db.review_reason,
        current_stock_qty=review_db.current_stock_qty,
        current_stock_value=review_db.current_stock_value,
        months_no_movement=review_db.months_no_movement,
        proposed_action=review_db.proposed_action,
        proposed_qty_adjustment=review_db.proposed_qty_adjustment,
        business_justification=review_db.business_justification,
        sme_name=review_db.sme_name,
        sme_email=review_db.sme_email,
        sme_department=review_db.sme_department,
        sme_feedback_method=review_db.sme_feedback_method,
        sme_contacted_date=review_db.sme_contacted_date,
        sme_responded_date=review_db.sme_responded_date,
        sme_recommendation=review_db.sme_recommendation,
        sme_recommended_qty=review_db.sme_recommended_qty,
        sme_analysis=review_db.sme_analysis,
        alternative_applications=review_db.alternative_applications,
        risk_assessment=review_db.risk_assessment,
        final_decision=review_db.final_decision,
        final_qty_adjustment=review_db.final_qty_adjustment,
        final_notes=review_db.final_notes,
        decided_by=review_db.decided_by,
        decided_by_user=decided_by_user,
        decided_at=review_db.decided_at,
        requires_follow_up=review_db.requires_follow_up,
        next_review_date=review_db.next_review_date,
        follow_up_reason=review_db.follow_up_reason,
        review_frequency_weeks=review_db.review_frequency_weeks,
        previous_review_id=review_db.previous_review_id,
        estimated_savings=review_db.estimated_savings,
        implementation_date=review_db.implementation_date,
        status=review_db.status,
        completed_checklist=review_db.completed_checklist,
        checklist=checklist,
        created_at=review_db.created_at,
        updated_at=review_db.updated_at,
        is_read_only=review_db.status
        in [ReviewStatus.COMPLETED.value, ReviewStatus.CANCELLED.value],
        comments_count=comments_count
    )


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

    # Verify that the material exists
    material_query = select(SAPMaterialData).where(
        SAPMaterialData.material_number == material_number
    )
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

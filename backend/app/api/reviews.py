"""Material reviews endpoints."""

from datetime import date, datetime

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
)
from sqlmodel import func, select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.api.rbac import check_user_is_admin, require_permission
from app.api.utils import calculate_workflow_state, determine_status_after_step
from app.core.auth import User, get_current_user
from app.core.database import get_db
from app.models.db_models import MaterialReviewDB, ProfileDB, ReviewAssignmentDB, ReviewChecklistDB, ReviewCommentDB, SAPMaterialData
from app.models.review import (
    MaterialReview,
    MaterialReviewCreate,
    MaterialReviewUpdate,
    ReviewChecklist,
    ReviewStatus,
    ReviewStepEnum,
)
from app.models.user import UserProfile
from app.services.notification_service import NotificationService

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

    # Fetch checklist data if it exists
    checklist_query = select(ReviewChecklistDB).where(ReviewChecklistDB.review_id == review_id)
    checklist_result = await db.exec(checklist_query)
    checklist_db = checklist_result.first()

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

    # Fetch initiator profile
    initiator_profile_query = select(ProfileDB).where(ProfileDB.id == review_db.initiated_by)
    initiator_profile_result = await db.exec(initiator_profile_query)
    initiator_profile = initiator_profile_result.first()

    initiated_by_user = None
    if initiator_profile:
        initiated_by_user = UserProfile(id=initiator_profile.id, full_name=initiator_profile.full_name)

    # Fetch decider profile if decided_by is set
    decided_by_user = None
    if review_db.decided_by:
        decider_profile_query = select(ProfileDB).where(ProfileDB.id == review_db.decided_by)
        decider_profile_result = await db.exec(decider_profile_query)
        decider_profile = decider_profile_result.first()

        if decider_profile:
            decided_by_user = UserProfile(id=decider_profile.id, full_name=decider_profile.full_name)

    # Get comment count
    comments_count_query = select(func.count(ReviewCommentDB.comment_id)).where(
        ReviewCommentDB.review_id == review_db.review_id
    )
    comments_count_result = await db.exec(comments_count_query)
    comments_count = comments_count_result.one() or 0

    # Check if both SME and approver are assigned
    assignments_query = select(ReviewAssignmentDB).where(
        ReviewAssignmentDB.review_id == review_id,
        ReviewAssignmentDB.status.notin_(["declined", "reassigned"]),
    )
    assignments_result = await db.exec(assignments_query)
    assignments = assignments_result.all()
    has_sme = any(a.assignment_type == "sme" for a in assignments)
    has_approver = any(a.assignment_type == "approver" for a in assignments)
    has_assignments = has_sme and has_approver

    # Get assigned user names
    assigned_sme_id = None
    assigned_sme_name = None
    assigned_approver_id = None
    assigned_approver_name = None
    for a in assignments:
        if a.assignment_type == "sme":
            assigned_sme_id = a.user_id
            # Fetch SME name
            sme_profile_query = select(ProfileDB).where(ProfileDB.id == a.user_id)
            sme_profile_result = await db.exec(sme_profile_query)
            sme_profile = sme_profile_result.first()
            if sme_profile:
                assigned_sme_name = sme_profile.full_name
        elif a.assignment_type == "approver":
            assigned_approver_id = a.user_id
            # Fetch approver name
            approver_profile_query = select(ProfileDB).where(ProfileDB.id == a.user_id)
            approver_profile_result = await db.exec(approver_profile_query)
            approver_profile = approver_profile_result.first()
            if approver_profile:
                assigned_approver_name = approver_profile.full_name

    # Calculate workflow state
    current_step, sme_required = calculate_workflow_state(review_db, has_assignments)

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
        proposed_safety_stock_qty=review_db.proposed_safety_stock_qty,
        proposed_unrestricted_qty=review_db.proposed_unrestricted_qty,
        business_justification=review_db.business_justification,
        sme_name=review_db.sme_name,
        sme_email=review_db.sme_email,
        sme_department=review_db.sme_department,
        sme_feedback_method=review_db.sme_feedback_method,
        sme_contacted_date=review_db.sme_contacted_date,
        sme_responded_date=review_db.sme_responded_date,
        sme_recommendation=review_db.sme_recommendation,
        sme_recommended_safety_stock_qty=review_db.sme_recommended_safety_stock_qty,
        sme_recommended_unrestricted_qty=review_db.sme_recommended_unrestricted_qty,
        sme_analysis=review_db.sme_analysis,
        alternative_applications=review_db.alternative_applications,
        risk_assessment=review_db.risk_assessment,
        final_decision=review_db.final_decision,
        final_safety_stock_qty=review_db.final_safety_stock_qty,
        final_unrestricted_qty=review_db.final_unrestricted_qty,
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
        is_read_only=review_db.status in [ReviewStatus.APPROVED.value, ReviewStatus.REJECTED.value, ReviewStatus.CANCELLED.value],
        comments_count=comments_count,
        assigned_sme_id=assigned_sme_id,
        assigned_sme_name=assigned_sme_name,
        assigned_approver_id=assigned_approver_id,
        assigned_approver_name=assigned_approver_name,
        current_step=current_step,
        sme_required=sme_required,
        has_assignments=has_assignments,
    )


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

    # Block a new review if there are any that exist which are not in a terminal state
    # Terminal states: approved, rejected, cancelled
    existing_review_query = select(MaterialReviewDB).where(
        MaterialReviewDB.material_number == material_number,
        MaterialReviewDB.status.notin_(["approved", "rejected", "cancelled"]),
    )
    existing_review_result = await db.exec(existing_review_query)
    existing_review = existing_review_result.first()

    if existing_review:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "An active review already exists for this material. A new review cannot be created until the existing one is completed or cancelled."
            ),
        )

    # Create the review database record
    review_db = MaterialReviewDB(
        created_by=current_user.id,
        last_updated_by=current_user.id,
        material_number=material_number,
        initiated_by=current_user.id,
        review_date=date.today(),
        review_reason=review_data.review_reason,
        current_stock_qty=material_exists.total_quantity,
        current_stock_value=material_exists.total_value,
        months_no_movement=review_data.months_no_movement,
        proposed_action=review_data.proposed_action,
        proposed_safety_stock_qty=review_data.proposed_safety_stock_qty,
        proposed_unrestricted_qty=review_data.proposed_unrestricted_qty,
        business_justification=review_data.business_justification,
        sme_name=review_data.sme_name,
        sme_email=review_data.sme_email,
        sme_department=review_data.sme_department,
        sme_feedback_method=review_data.sme_feedback_method,
        sme_contacted_date=review_data.sme_contacted_date,
        sme_responded_date=review_data.sme_responded_date,
        sme_recommendation=review_data.sme_recommendation,
        sme_recommended_safety_stock_qty=review_data.sme_recommended_safety_stock_qty,
        sme_recommended_unrestricted_qty=review_data.sme_recommended_unrestricted_qty,
        sme_analysis=review_data.sme_analysis,
        alternative_applications=review_data.alternative_applications,
        risk_assessment=review_data.risk_assessment,
        final_decision=review_data.final_decision,
        final_safety_stock_qty=review_data.final_safety_stock_qty,
        final_unrestricted_qty=review_data.final_unrestricted_qty,
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
    initiator_profile_query = select(ProfileDB).where(ProfileDB.id == review_db.initiated_by)
    initiator_profile_result = await db.exec(initiator_profile_query)
    initiator_profile = initiator_profile_result.first()

    # Create user profile object if profile exists
    initiated_by_user = None
    if initiator_profile:
        initiated_by_user = UserProfile(id=initiator_profile.id, full_name=initiator_profile.full_name)

    # Calculate workflow state (new review has no assignments)
    current_step, sme_required = calculate_workflow_state(review_db, has_assignments=False)

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
        proposed_safety_stock_qty=review_db.proposed_safety_stock_qty,
        proposed_unrestricted_qty=review_db.proposed_unrestricted_qty,
        business_justification=review_db.business_justification,
        sme_name=review_db.sme_name,
        sme_email=review_db.sme_email,
        sme_department=review_db.sme_department,
        sme_feedback_method=review_db.sme_feedback_method,
        sme_contacted_date=review_db.sme_contacted_date,
        sme_responded_date=review_db.sme_responded_date,
        sme_recommendation=review_db.sme_recommendation,
        sme_recommended_safety_stock_qty=review_db.sme_recommended_safety_stock_qty,
        sme_recommended_unrestricted_qty=review_db.sme_recommended_unrestricted_qty,
        sme_analysis=review_db.sme_analysis,
        alternative_applications=review_db.alternative_applications,
        risk_assessment=review_db.risk_assessment,
        final_decision=review_db.final_decision,
        final_safety_stock_qty=review_db.final_safety_stock_qty,
        final_unrestricted_qty=review_db.final_unrestricted_qty,
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
        comments_count=0,  # New review has no comments yet
        # Workflow state fields
        current_step=current_step,
        sme_required=sme_required,
        has_assignments=False,  # New review has no assignments
    )


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

    # Block edits if status is in a terminal state (approved, rejected, cancelled)
    if review_db.status in ["approved", "rejected", "cancelled"]:
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
        checklist_query = select(ReviewChecklistDB).where(ReviewChecklistDB.review_id == review_id)
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
    if "requires_follow_up" in update_data and update_data["requires_follow_up"] is False:
        review_db.next_review_date = None
        review_db.follow_up_reason = None
        review_db.review_frequency_weeks = None

    # Capture old status before update for notification purposes
    old_status = review_db.status

    # Determine and update status based on step completion
    new_status = determine_status_after_step(step, review_db, update_data)
    review_db.status = new_status

    # Auto-set decided_by and decided_at when status becomes a terminal decision state
    if new_status in (ReviewStatus.APPROVED.value, ReviewStatus.REJECTED.value) and not review_db.decided_at:
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

    # Send notification if status changed
    if old_status != new_status:
        from uuid import UUID

        notification_service = NotificationService(db)
        await notification_service.notify_status_change(
            review=review_db,
            old_status=old_status,
            new_status=new_status,
            changed_by=UUID(current_user.id),
        )

    # Query checklist data if it exists
    from app.models.db_models import ReviewChecklistDB

    checklist_query = select(ReviewChecklistDB).where(ReviewChecklistDB.review_id == review_id)
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
    initiator_profile_query = select(ProfileDB).where(ProfileDB.id == review_db.initiated_by)
    initiator_profile_result = await db.exec(initiator_profile_query)
    initiator_profile = initiator_profile_result.first()

    # Create initiator user profile object if profile exists
    initiated_by_user = None
    if initiator_profile:
        initiated_by_user = UserProfile(id=initiator_profile.id, full_name=initiator_profile.full_name)

    # Fetch decider profile if decided_by is set
    decided_by_user = None
    if review_db.decided_by:
        decider_profile_query = select(ProfileDB).where(ProfileDB.id == review_db.decided_by)
        decider_profile_result = await db.exec(decider_profile_query)
        decider_profile = decider_profile_result.first()

        if decider_profile:
            decided_by_user = UserProfile(id=decider_profile.id, full_name=decider_profile.full_name)

    # Get comment count for this review
    comments_count_query = select(func.count(ReviewCommentDB.comment_id)).where(ReviewCommentDB.review_id == review_db.review_id)
    comments_count_result = await db.exec(comments_count_query)
    comments_count = comments_count_result.one() or 0

    # Check if both SME and approver are assigned (for workflow state)
    assignments_query = select(ReviewAssignmentDB).where(
        ReviewAssignmentDB.review_id == review_id,
        ReviewAssignmentDB.status.notin_(["declined", "reassigned"]),
    )
    assignments_result = await db.exec(assignments_query)
    assignments = assignments_result.all()
    has_sme = any(a.assignment_type == "sme" for a in assignments)
    has_approver = any(a.assignment_type == "approver" for a in assignments)
    has_assignments = has_sme and has_approver

    # Calculate workflow state
    current_step, sme_required = calculate_workflow_state(review_db, has_assignments)

    # If the review is marked as approved, ensure all OTHER approved reviews are marked as superseded
    if review_db.status == ReviewStatus.APPROVED.value:
        print("Marking other reviews as superseded")
        approved_reviews_query = select(MaterialReviewDB).where(
            MaterialReviewDB.material_number == material_number,
            MaterialReviewDB.review_id != review_db.review_id,  # Exclude current review
            MaterialReviewDB.status == "approved",
            MaterialReviewDB.is_superseded.is_(False),
        )
        approved_reviews_result = await db.exec(approved_reviews_query)
        approved_reviews = approved_reviews_result.all()

        for review in approved_reviews:
            review.is_superseded = True
            db.add(review)
        await db.commit()

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
        proposed_safety_stock_qty=review_db.proposed_safety_stock_qty,
        proposed_unrestricted_qty=review_db.proposed_unrestricted_qty,
        business_justification=review_db.business_justification,
        sme_name=review_db.sme_name,
        sme_email=review_db.sme_email,
        sme_department=review_db.sme_department,
        sme_feedback_method=review_db.sme_feedback_method,
        sme_contacted_date=review_db.sme_contacted_date,
        sme_responded_date=review_db.sme_responded_date,
        sme_recommendation=review_db.sme_recommendation,
        sme_recommended_safety_stock_qty=review_db.sme_recommended_safety_stock_qty,
        sme_recommended_unrestricted_qty=review_db.sme_recommended_unrestricted_qty,
        sme_analysis=review_db.sme_analysis,
        alternative_applications=review_db.alternative_applications,
        risk_assessment=review_db.risk_assessment,
        final_decision=review_db.final_decision,
        final_safety_stock_qty=review_db.final_safety_stock_qty,
        final_unrestricted_qty=review_db.final_unrestricted_qty,
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
        is_read_only=review_db.status in [ReviewStatus.APPROVED.value, ReviewStatus.REJECTED.value, ReviewStatus.CANCELLED.value],
        comments_count=comments_count,
        # Workflow state fields
        current_step=current_step,
        sme_required=sme_required,
        has_assignments=has_assignments,
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

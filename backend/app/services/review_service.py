"""Review service for material review business logic."""

from datetime import date, datetime
from uuid import UUID

from fastapi import HTTPException, status
from sqlmodel import func, select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.api.utils import calculate_workflow_state
from app.models.assignment import AssignmentStatus
from app.models.db_models import (
    MaterialReviewDB,
    ProfileDB,
    ReviewAssignmentDB,
    ReviewChecklistDB,
    ReviewCommentDB,
)
from app.models.review import (
    MaterialReview,
    MaterialReviewCreate,
    ReviewChecklist,
    ReviewStatus,
    UserReviewContext,
)
from app.models.user import UserProfile
from app.services.notification_service import NotificationService
from app.services.workflow import TERMINAL_STATES, ReviewStateMachine


class ReviewService:
    """Service layer for material review business logic.

    This service centralizes review-related operations that were previously
    scattered across endpoint handlers. It integrates with the ReviewStateMachine
    for workflow logic.
    """

    # =========================================================================
    # Field Sets for Step-Based Locking
    # =========================================================================

    # Fields editable during Draft phase (Steps 0-2: General Info, Checklist, Assignment)
    # These are locked once the review moves to PENDING_SME
    INITIATOR_FIELDS = {
        # Step 0: General Info
        "review_reason",
        "months_no_movement",
        "proposed_action",
        "proposed_safety_stock_qty",
        "proposed_unrestricted_qty",
        "business_justification",
        # Step 1: Checklist
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
    }

    # Fields editable during Pending Decision phase (Step 4: Follow-up)
    # Only the assigned approver can edit these
    FOLLOW_UP_FIELDS = {
        "requires_follow_up",
        "next_review_date",
        "follow_up_reason",
        "review_frequency_weeks",
    }

    def __init__(self, db: AsyncSession):
        self.db = db

    async def build_review_response(
        self,
        review: MaterialReviewDB,
        user_role: str | None = None,
    ) -> MaterialReview:
        """Build full MaterialReview response with all enrichments.

        This consolidates the data fetching and response building that was
        previously duplicated across get_review(), create_material_review(),
        and update_material_review() endpoints.

        Args:
            review: The review database record
            user_role: The requesting user's role ('initiator', 'sme', 'approver',
                      'admin', 'viewer'). If provided, user_context will be included.

        Returns:
            Fully enriched MaterialReview response model
        """
        review_id = review.review_id

        # 1. Fetch checklist data if it exists
        checklist = await self._get_checklist(review_id)

        # 2. Fetch initiator profile
        initiated_by_user = await self._get_user_profile(review.initiated_by)

        # 3. Get comment count
        comments_count = await self._get_comments_count(review_id)

        # 4. Fetch assignments and extract SME/approver info
        (
            has_assignments,
            assigned_sme_id,
            assigned_sme_name,
            assigned_approver_id,
            assigned_approver_name,
        ) = await self._get_assignment_info(review_id)

        # 5. Calculate workflow state
        current_step, sme_required = calculate_workflow_state(review, has_assignments)

        # 6. Calculate user context if role is provided
        user_context = None
        if user_role:
            user_context = self.get_user_context(user_role, review.status)

        # 7. Build and return MaterialReview response
        return MaterialReview(
            created_by=review.created_by,
            last_updated_by=review.last_updated_by,
            review_id=review.review_id,
            material_number=review.material_number,
            initiated_by=review.initiated_by,
            initiated_by_user=initiated_by_user,
            review_date=review.review_date,
            review_reason=review.review_reason,
            current_stock_qty=review.current_stock_qty,
            current_stock_value=review.current_stock_value,
            months_no_movement=review.months_no_movement,
            proposed_action=review.proposed_action,
            proposed_safety_stock_qty=review.proposed_safety_stock_qty,
            proposed_unrestricted_qty=review.proposed_unrestricted_qty,
            business_justification=review.business_justification,
            sme_recommendation=review.sme_recommendation,
            sme_recommended_safety_stock_qty=review.sme_recommended_safety_stock_qty,
            sme_recommended_unrestricted_qty=review.sme_recommended_unrestricted_qty,
            sme_analysis=review.sme_analysis,
            alternative_applications=review.alternative_applications,
            risk_assessment=review.risk_assessment,
            final_decision=review.final_decision,
            final_safety_stock_qty=review.final_safety_stock_qty,
            final_unrestricted_qty=review.final_unrestricted_qty,
            final_notes=review.final_notes,
            requires_follow_up=review.requires_follow_up,
            next_review_date=review.next_review_date,
            follow_up_reason=review.follow_up_reason,
            review_frequency_weeks=review.review_frequency_weeks,
            previous_review_id=review.previous_review_id,
            estimated_savings=review.estimated_savings,
            implementation_date=review.implementation_date,
            status=review.status,
            completed_checklist=review.completed_checklist,
            checklist=checklist,
            created_at=review.created_at,
            updated_at=review.updated_at,
            is_read_only=ReviewStateMachine.is_terminal(review.status),
            comments_count=comments_count,
            assigned_sme_id=assigned_sme_id,
            assigned_sme_name=assigned_sme_name,
            assigned_approver_id=assigned_approver_id,
            assigned_approver_name=assigned_approver_name,
            current_step=current_step,
            sme_required=sme_required,
            has_assignments=has_assignments,
            user_context=user_context,
        )

    # =========================================================================
    # Create/Update Operations
    # =========================================================================

    async def create_review(
        self,
        material_number: int,
        review_data: MaterialReviewCreate,
        user_id: str,
        current_stock_qty: float | None,
        current_stock_value: float | None,
    ) -> MaterialReviewDB:
        """Create a new review for a material.

        Args:
            material_number: The material number
            review_data: The review creation data
            user_id: The ID of the user creating the review
            current_stock_qty: Current stock quantity from material data
            current_stock_value: Current stock value from material data

        Returns:
            The created MaterialReviewDB record

        Raises:
            HTTPException 500 if database save fails
        """
        review_db = MaterialReviewDB(
            created_by=user_id,
            last_updated_by=user_id,
            material_number=material_number,
            initiated_by=user_id,
            review_date=date.today(),
            review_reason=review_data.review_reason,
            current_stock_qty=current_stock_qty,
            current_stock_value=current_stock_value,
            months_no_movement=review_data.months_no_movement,
            proposed_action=review_data.proposed_action,
            proposed_safety_stock_qty=review_data.proposed_safety_stock_qty,
            proposed_unrestricted_qty=review_data.proposed_unrestricted_qty,
            business_justification=review_data.business_justification,
            previous_review_id=review_data.previous_review_id,
            status="draft",
        )

        try:
            self.db.add(review_db)
            await self.db.commit()
            await self.db.refresh(review_db)
        except Exception as e:
            await self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to save review: {str(e)}",
            )

        return review_db

    async def update_review_step(
        self,
        review_db: MaterialReviewDB,
        step: int,
        update_data: dict,
        user_id: str,
    ) -> MaterialReviewDB:
        """Update a review based on the step being completed.

        This method handles all the logic for updating a review when a step
        is submitted, including:
        - Status-based field locking (immutability after workflow progression)
        - Role-based field permission validation (SME/approver restrictions)
        - Checklist handling for step 1
        - Field updates
        - Auto-clearing follow-up fields
        - Status transitions
        - Notification dispatch and supersession handling

        Args:
            review_db: The review database record to update
            step: The step index being completed (0-5)
            update_data: The fields to update
            user_id: The ID of the user making the update

        Returns:
            The updated MaterialReviewDB record

        Raises:
            HTTPException 403 if fields are locked or user lacks permission
            HTTPException 500 if database save fails
        """
        from app.api.utils import determine_status_after_step
        from app.models.review import ReviewStepEnum

        # Convert step index to enum for determine_status_after_step
        step_enum = ReviewStepEnum(step)

        # Validate status-based field locking (throws 403 if fields are locked)
        # This must come before role-based validation to check WHAT can be edited
        self.validate_step_locking(review_db.status, update_data)

        # Validate role-based field permissions (throws 403 if unauthorized)
        # This checks WHO can edit the allowed fields (SME/approver restrictions)
        await self.validate_field_permissions(
            review_db.review_id, user_id, update_data
        )

        # Checklist step special handling
        if step == "checklist":
            # Save checklist and get update_data with checklist fields removed
            update_data = await self.save_checklist(
                review_db.review_id, update_data, user_id
            )
            # Mark checklist as completed on the review
            review_db.completed_checklist = True

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
        new_status = determine_status_after_step(step_enum, review_db, update_data)
        review_db.status = new_status

        # Update last_updated_by and updated_at
        review_db.last_updated_by = user_id
        review_db.updated_at = datetime.now()

        # Save to database
        try:
            self.db.add(review_db)
            await self.db.commit()
            await self.db.refresh(review_db)
        except Exception as e:
            await self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to update review: {str(e)}",
            )

        # Handle status transition side effects (notifications, supersession)
        if old_status != new_status:
            await self.handle_status_transition(
                review=review_db,
                old_status=old_status,
                new_status=new_status,
                changed_by=UUID(user_id),
            )

        return review_db

    # =========================================================================
    # Role-Based Field Restrictions
    # =========================================================================

    # Fields that only the assigned SME can update (Step 3: SME Investigation)
    SME_RESTRICTED_FIELDS = {
        "sme_recommendation",
        "sme_recommended_safety_stock_qty",
        "sme_recommended_unrestricted_qty",
        "sme_analysis",
        "alternative_applications",
        "risk_assessment",
    }

    # Fields that only the assigned approver can update (Steps 4-5: Follow-up & Final Decision)
    APPROVER_RESTRICTED_FIELDS = {
        # Step 4: Follow-up
        "requires_follow_up",
        "next_review_date",
        "follow_up_reason",
        "review_frequency_weeks",
        # Step 5: Final Decision
        "final_decision",
        "final_safety_stock_qty",
        "final_unrestricted_qty",
        "final_notes",
        "estimated_savings",
        "implementation_date",
    }

    # =========================================================================
    # Status-Based Field Locking
    # =========================================================================
    # Defines which fields are editable at each workflow status.
    # Fields not in the editable set for a status are locked.
    #
    # | Status             | Editable Fields                        |
    # |--------------------|----------------------------------------|
    # | draft              | INITIATOR_FIELDS                       |
    # | pending_assignment | INITIATOR_FIELDS                       |
    # | pending_sme        | SME_RESTRICTED_FIELDS                  |
    # | pending_decision   | FOLLOW_UP_FIELDS + APPROVER_RESTRICTED |
    # | terminal states    | None (handled by validate_can_edit)    |

    @classmethod
    def get_editable_fields_for_status(cls, status: str) -> set[str]:
        """Get the set of fields that can be edited for a given status.

        Args:
            status: The review status string

        Returns:
            Set of field names that are editable at this status
        """
        if status in ("draft", "pending_assignment"):
            return cls.INITIATOR_FIELDS
        elif status == "pending_sme":
            return cls.SME_RESTRICTED_FIELDS
        elif status == "pending_decision":
            return cls.FOLLOW_UP_FIELDS | cls.APPROVER_RESTRICTED_FIELDS
        else:
            # Terminal states - no fields editable (handled by validate_can_edit)
            return set()

    # =========================================================================
    # Checklist Operations
    # =========================================================================

    # All checklist field names
    CHECKLIST_FIELDS = [
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

    # Required boolean fields that must be present
    REQUIRED_CHECKLIST_FIELDS = [
        "has_open_orders",
        "has_forecast_demand",
        "checked_alternate_plants",
        "contacted_procurement",
        "reviewed_bom_usage",
        "checked_supersession",
        "checked_historical_usage",
    ]

    async def save_checklist(
        self,
        review_id: int,
        update_data: dict,
        updated_by: str,
    ) -> dict:
        """Validate and save checklist data for a review.

        Extracts checklist fields from update_data, validates required fields,
        and upserts to the ReviewChecklistDB table.

        Args:
            review_id: The review ID
            update_data: The full update data dict (will extract checklist fields)
            updated_by: User ID who is making the update

        Returns:
            The update_data dict with checklist fields removed

        Raises:
            HTTPException 400 if required checklist fields are missing
        """
        # Extract checklist fields from update_data
        checklist_data = {
            k: v for k, v in update_data.items() if k in self.CHECKLIST_FIELDS
        }

        # Validate that all required boolean fields are present
        missing_fields = [
            f for f in self.REQUIRED_CHECKLIST_FIELDS if f not in checklist_data
        ]
        if missing_fields:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Checklist step requires all boolean fields: {missing_fields}. You provided: {list(checklist_data.keys())}",
            )

        # Upsert checklist data
        query = select(ReviewChecklistDB).where(
            ReviewChecklistDB.review_id == review_id
        )
        result = await self.db.exec(query)
        existing_checklist = result.first()

        if existing_checklist:
            # Update existing checklist
            for field, value in checklist_data.items():
                setattr(existing_checklist, field, value)
            existing_checklist.last_updated_by = updated_by
            existing_checklist.updated_at = datetime.now()
            self.db.add(existing_checklist)
        else:
            # Create new checklist
            new_checklist = ReviewChecklistDB(
                review_id=review_id,
                **checklist_data,
                created_by=updated_by,
                last_updated_by=updated_by,
            )
            self.db.add(new_checklist)

        # Return update_data with checklist fields removed
        return {k: v for k, v in update_data.items() if k not in self.CHECKLIST_FIELDS}

    async def _is_user_assigned(
        self,
        review_id: int,
        user_id: str,
        assignment_type: str,
    ) -> bool:
        """Check if a user is assigned to a review with a specific role.

        Args:
            review_id: The review ID
            user_id: The user ID to check
            assignment_type: 'sme' or 'approver'

        Returns:
            True if the user is assigned with the given role
        """
        query = select(ReviewAssignmentDB).where(
            ReviewAssignmentDB.review_id == review_id,
            ReviewAssignmentDB.user_id == UUID(user_id),
            ReviewAssignmentDB.assignment_type == assignment_type,
            ReviewAssignmentDB.status.notin_(["declined", "reassigned"]),
        )
        result = await self.db.exec(query)
        return result.first() is not None

    async def _is_user_admin(self, user_id: str) -> bool:
        """Check if a user has admin role.

        Args:
            user_id: The user ID to check

        Returns:
            True if the user is an admin
        """
        from app.api.rbac import check_user_is_admin

        return await check_user_is_admin(user_id, self.db)

    async def validate_field_permissions(
        self,
        review_id: int,
        user_id: str,
        update_data: dict,
    ) -> None:
        """Validate that the user has permission to update the requested fields.

        Raises an error if user attempts to update SME-restricted fields without
        being the assigned SME, or approver-restricted fields without being the
        assigned approver.

        Note: Admins must assign themselves as SME/approver to edit those fields.
        There is no admin bypass for role-based field restrictions.

        Args:
            review_id: The review ID
            user_id: The user making the update
            update_data: The fields being updated

        Raises:
            HTTPException 403 if user attempts to update unauthorized fields
        """
        # Check for SME-restricted fields
        sme_fields_in_update = set(update_data.keys()) & self.SME_RESTRICTED_FIELDS
        if sme_fields_in_update:
            is_assigned_sme = await self._is_user_assigned(review_id, user_id, "sme")
            if not is_assigned_sme:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=(
                        f"You don't have permission to update these fields: "
                        f"{sorted(sme_fields_in_update)}. "
                        f"Only the assigned SME can update SME investigation fields."
                    ),
                )

        # Check for approver-restricted fields
        approver_fields_in_update = set(update_data.keys()) & self.APPROVER_RESTRICTED_FIELDS
        if approver_fields_in_update:
            is_assigned_approver = await self._is_user_assigned(review_id, user_id, "approver")
            if not is_assigned_approver:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=(
                        f"You don't have permission to update these fields: "
                        f"{sorted(approver_fields_in_update)}. "
                        f"Only the assigned approver can update final decision fields."
                    ),
                )

    def validate_step_locking(
        self,
        review_status: str,
        update_data: dict,
    ) -> None:
        """Validate that only status-appropriate fields are being updated.

        This enforces immutability of earlier workflow phases:
        - Draft/Pending Assignment: Only initiator fields editable
        - Pending SME: Only SME fields editable (initiator fields locked)
        - Pending Decision: Only approver fields editable (SME fields locked)

        Args:
            review_status: The current review status
            update_data: The fields being updated

        Raises:
            HTTPException 403 if attempting to update locked fields
        """
        editable_fields = self.get_editable_fields_for_status(review_status)
        attempted_fields = set(update_data.keys())
        locked_fields = attempted_fields - editable_fields

        if locked_fields:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    f"Cannot update these fields at status '{review_status}': "
                    f"{sorted(locked_fields)}. "
                    f"These fields are locked after workflow progression."
                ),
            )

    # =========================================================================
    # Validation Operations
    # =========================================================================

    async def validate_no_active_review(self, material_number: int) -> None:
        """Validate that no active (non-terminal) review exists for the material.

        Args:
            material_number: The material number to check

        Raises:
            HTTPException 400 if an active review already exists
        """
        from app.services.workflow import TERMINAL_STATES

        query = select(MaterialReviewDB).where(
            MaterialReviewDB.material_number == material_number,
            MaterialReviewDB.status.notin_(TERMINAL_STATES),
        )
        result = await self.db.exec(query)
        existing_review = result.first()

        if existing_review:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    "An active review already exists for this material. "
                    "A new review cannot be created until the existing one "
                    "is completed or cancelled."
                ),
            )

    def validate_can_edit(self, review: MaterialReviewDB) -> None:
        """Validate that a review can be edited (not in terminal state).

        Args:
            review: The review database record

        Raises:
            HTTPException 403 if the review is in a terminal state
        """
        if ReviewStateMachine.is_terminal(review.status):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Cannot edit review with status '{review.status}'. Review is locked.",
            )

    # =========================================================================
    # Status Transition Operations
    # =========================================================================

    async def handle_status_transition(
        self,
        review: MaterialReviewDB,
        old_status: str,
        new_status: str,
        changed_by: UUID,
    ) -> None:
        """Handle side effects of a status transition.

        This method is called after a status change has been persisted.
        It handles:
        - Sending notifications to relevant users
        - Marking previous approved reviews as superseded (on approval)
        - Completing/cancelling assignments when entering terminal state

        Args:
            review: The review database record (after status change)
            old_status: The previous status
            new_status: The new status
            changed_by: User ID who triggered the change
        """
        # Send notification about the status change
        notification_service = NotificationService(self.db)
        await notification_service.notify_status_change(
            review=review,
            old_status=old_status,
            new_status=new_status,
            changed_by=changed_by,
        )

        # If approved, supersede other approved reviews for this material
        if new_status == ReviewStatus.APPROVED.value:
            await self.supersede_previous_approvals(
                review.material_number, review.review_id
            )

        # If entering a terminal state, complete/cancel all assignments
        if new_status in TERMINAL_STATES:
            await self.complete_assignments_for_review(review.review_id, new_status)

    async def supersede_previous_approvals(
        self,
        material_number: int,
        current_review_id: int,
    ) -> list[int]:
        """Mark other approved reviews for this material as superseded.

        When a new review is approved, all previous approved reviews should
        be marked as superseded since only one approval should be "active".

        Args:
            material_number: The material number
            current_review_id: The review ID that is being approved (to exclude)

        Returns:
            List of review IDs that were marked as superseded
        """
        query = select(MaterialReviewDB).where(
            MaterialReviewDB.material_number == material_number,
            MaterialReviewDB.review_id != current_review_id,
            MaterialReviewDB.status == ReviewStatus.APPROVED.value,
            MaterialReviewDB.is_superseded.is_(False),
        )
        result = await self.db.exec(query)
        approved_reviews = result.all()

        superseded_ids = []
        for review in approved_reviews:
            review.is_superseded = True
            self.db.add(review)
            superseded_ids.append(review.review_id)

        if superseded_ids:
            await self.db.commit()

        return superseded_ids

    async def complete_assignments_for_review(
        self,
        review_id: int,
        new_status: str,
    ) -> int:
        """Complete or cancel all pending/accepted assignments when review reaches terminal state.

        When a review is completed (approved/rejected), assignments are marked COMPLETED.
        When a review is cancelled, assignments are marked CANCELLED.

        Only updates assignments that are in PENDING or ACCEPTED status - already
        DECLINED, REASSIGNED, or COMPLETED assignments are left unchanged.

        Args:
            review_id: The review ID
            new_status: The terminal status the review transitioned to

        Returns:
            Number of assignments updated
        """
        # Determine the target assignment status based on review status
        if new_status == ReviewStatus.CANCELLED.value:
            target_status = AssignmentStatus.CANCELLED.value
        else:
            # For approved/rejected, mark as completed
            target_status = AssignmentStatus.COMPLETED.value

        # Find all active assignments (pending or accepted)
        query = select(ReviewAssignmentDB).where(
            ReviewAssignmentDB.review_id == review_id,
            ReviewAssignmentDB.status.in_([
                AssignmentStatus.PENDING.value,
                AssignmentStatus.ACCEPTED.value,
            ]),
        )
        result = await self.db.exec(query)
        assignments = result.all()

        # Update each assignment
        updated_count = 0
        for assignment in assignments:
            assignment.status = target_status
            assignment.completed_at = datetime.now()
            self.db.add(assignment)
            updated_count += 1

        if updated_count > 0:
            await self.db.commit()

        return updated_count

    # =========================================================================
    # Private helper methods
    # =========================================================================

    async def _get_checklist(self, review_id: int) -> ReviewChecklist | None:
        """Fetch and convert checklist data for a review."""
        query = select(ReviewChecklistDB).where(ReviewChecklistDB.review_id == review_id)
        result = await self.db.exec(query)
        checklist_db = result.first()

        if not checklist_db:
            return None

        return ReviewChecklist(
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

    async def _get_user_profile(self, user_id: UUID | None) -> UserProfile | None:
        """Fetch a user profile by ID."""
        if not user_id:
            return None

        query = select(ProfileDB).where(ProfileDB.id == user_id)
        result = await self.db.exec(query)
        profile = result.first()

        if not profile:
            return None

        return UserProfile(id=profile.id, full_name=profile.full_name)

    async def _get_comments_count(self, review_id: int) -> int:
        """Get the number of comments for a review."""
        query = select(func.count(ReviewCommentDB.comment_id)).where(
            ReviewCommentDB.review_id == review_id
        )
        result = await self.db.exec(query)
        return result.one() or 0

    async def _get_assignment_info(
        self,
        review_id: int,
    ) -> tuple[bool, UUID | None, str | None, UUID | None, str | None]:
        """Get assignment information for a review.

        Returns:
            Tuple of (has_assignments, assigned_sme_id, assigned_sme_name,
                     assigned_approver_id, assigned_approver_name)
        """
        # Fetch active assignments
        query = select(ReviewAssignmentDB).where(
            ReviewAssignmentDB.review_id == review_id,
            ReviewAssignmentDB.status.notin_(["declined", "reassigned"]),
        )
        result = await self.db.exec(query)
        assignments = result.all()

        # Check if both SME and approver are assigned
        has_sme = any(a.assignment_type == "sme" for a in assignments)
        has_approver = any(a.assignment_type == "approver" for a in assignments)
        has_assignments = has_sme and has_approver

        # Extract SME and approver info
        assigned_sme_id = None
        assigned_sme_name = None
        assigned_approver_id = None
        assigned_approver_name = None

        for assignment in assignments:
            if assignment.assignment_type == "sme":
                assigned_sme_id = assignment.user_id
                profile = await self._get_user_profile(assignment.user_id)
                if profile:
                    assigned_sme_name = profile.full_name
            elif assignment.assignment_type == "approver":
                assigned_approver_id = assignment.user_id
                profile = await self._get_user_profile(assignment.user_id)
                if profile:
                    assigned_approver_name = profile.full_name

        return (
            has_assignments,
            assigned_sme_id,
            assigned_sme_name,
            assigned_approver_id,
            assigned_approver_name,
        )

    def get_user_context(
        self,
        role: str,
        review_status: str,
    ) -> UserReviewContext:
        """Calculate user context including editable steps and guidance.

        Args:
            role: The user's role ('initiator', 'sme', 'approver', 'admin', 'viewer')
            review_status: The current review status

        Returns:
            UserReviewContext with role, editable_steps, and guidance
        """
        editable_steps: list[str] = []
        guidance: str | None = None

        if role == "admin":
            # Admins can edit based on status (but must assign themselves for role-restricted fields)
            if review_status in ("draft", "pending_assignment"):
                editable_steps = ["general_info", "checklist", "assignment"]
                guidance = "You have admin access. Complete the initial details and assign reviewers."
            elif review_status == "pending_sme":
                editable_steps = ["sme_investigation"]
                guidance = "You have admin access. The SME review step is active."
            elif review_status == "pending_decision":
                editable_steps = ["follow_up", "final_decision"]
                guidance = "You have admin access. The final decision step is active."
            else:
                guidance = "You have admin access. This review is in a terminal state."

        elif role == "initiator":
            if review_status in ("draft", "pending_assignment"):
                editable_steps = ["general_info", "checklist", "assignment"]
                guidance = "Complete the initial review details and assign reviewers."
            else:
                guidance = "You initiated this review. It's now with the assigned reviewers."

        elif role == "sme":
            if review_status == "pending_sme":
                editable_steps = ["sme_investigation"]
                guidance = "Please complete your SME review and provide your recommendation."
            elif review_status == "pending_decision":
                guidance = "Your SME review is complete. Awaiting final decision."
            else:
                guidance = "This review is not yet ready for your SME review."

        elif role == "approver":
            if review_status == "pending_decision":
                editable_steps = ["follow_up", "final_decision"]
                guidance = "Review the SME feedback and make your final decision."
            elif review_status in ("approved", "rejected"):
                guidance = "You completed the final decision for this review."
            else:
                guidance = "This review is not yet ready for your decision."

        elif role == "viewer":
            guidance = "You have view-only access to this review."

        return UserReviewContext(
            role=role,
            editable_steps=editable_steps,
            guidance=guidance,
        )

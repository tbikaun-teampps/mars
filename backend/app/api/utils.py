from typing import Any, Optional

from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.models.db_models import LookupOptionDB, MaterialReviewDB
from app.models.material import ConsumptionHistory, Material
from app.models.review import (
    ReviewStatus,
    ReviewStepEnum,
)

# Fallback set for SME-required actions (used when config not available)
# These should match the `requires_sme: true` flags in lookup_options.config
_SME_REQUIRED_ACTIONS_FALLBACK = {"keep_reclassify", "keep_adjust_levels", "run_down", "dispose"}


async def get_proposed_action_config(
    db: AsyncSession, proposed_action: str
) -> Optional[dict[str, Any]]:
    """Get the config for a proposed action from lookup_options.

    Args:
        db: Database session
        proposed_action: The proposed action value (e.g., 'keep_no_change')

    Returns:
        The config dict if found, None otherwise
    """
    stmt = select(LookupOptionDB.config).where(
        LookupOptionDB.category == "proposed_action",
        LookupOptionDB.value == proposed_action,
        LookupOptionDB.is_active.is_(True),
    )
    result = await db.exec(stmt)
    return result.first()


def is_sme_required(
    proposed_action: str | None,
    config: Optional[dict[str, Any]] = None,
) -> bool:
    """Determine if SME review is required based on proposed action.

    Args:
        proposed_action: The proposed action value
        config: Optional config dict from lookup_options. If provided,
                uses the 'requires_sme' flag. Otherwise falls back to
                hardcoded set.

    Returns:
        True if SME review is required, False otherwise
    """
    if not proposed_action:
        return False

    # If config provided, use the requires_sme flag
    if config is not None:
        return config.get("requires_sme", False)

    # Fallback to hardcoded set
    return proposed_action in _SME_REQUIRED_ACTIONS_FALLBACK


def transform_db_record_to_material(record: dict) -> Material:
    """Transform a database record into a Material model with computed fields."""
    # Calculate unit_value
    unit_value = None
    if record.get("total_value") and record.get("total_quantity") and record["total_quantity"] != 0:
        unit_value = record["total_value"] / record["total_quantity"]

    # Transform consumption history from individual columns to array
    consumption_history_5yr = None
    cons_values = [
        (1, record.get("cons_1y")),
        (2, record.get("cons_2y")),
        (3, record.get("cons_3y")),
        (4, record.get("cons_4y")),
        (5, record.get("cons_5y")),
    ]
    # Only create array if at least one value is not None
    if any(val is not None for _, val in cons_values):
        consumption_history_5yr = [ConsumptionHistory(years_ago=years_ago, quantity=qty if qty is not None else 0) for years_ago, qty in cons_values]

    return Material(
        **record,
        unit_value=unit_value,
        consumption_history_5yr=consumption_history_5yr,
    )


def determine_status_after_step(
    step: ReviewStepEnum,
    review_db: MaterialReviewDB,
    update_data: dict,
) -> str:
    """Determine new status based on completed step and data.

    Args:
        step: The step that was just completed
        review_db: The existing review database record
        update_data: The data being updated in this step

    Returns:
        The new status string
    """
    if step == ReviewStepEnum.GENERAL_INFO:
        # Step 1: General info complete, stays draft
        return ReviewStatus.DRAFT.value

    elif step == ReviewStepEnum.CHECKLIST:
        # Step 2: Checklist complete, promote to pending_assignment
        return ReviewStatus.PENDING_ASSIGNMENT.value

    elif step == ReviewStepEnum.ASSIGNMENT:
        # Step 3: Assignment complete, promote to pending_sme
        # Note: The actual status update is done in assignments.py when assignments are created
        return ReviewStatus.PENDING_SME.value

    elif step == ReviewStepEnum.SME_INVESTIGATION:
        # Step 4: SME investigation - check progression
        # If SME responded with recommendation, move to pending_decision
        if update_data.get("sme_responded_date") and update_data.get("sme_recommendation"):
            return ReviewStatus.PENDING_DECISION.value
        # If SME contacted (but not yet responded), keep pending_sme
        elif update_data.get("sme_contacted_date"):
            return ReviewStatus.PENDING_SME.value
        # Otherwise, keep current status
        return review_db.status

    elif step == ReviewStepEnum.FOLLOW_UP:
        # Step 5: Follow-up is optional, no status change
        return review_db.status

    elif step == ReviewStepEnum.FINAL_DECISION:
        # Step 6: Final decision - if decision is made, mark approved or rejected
        final_decision = update_data.get("final_decision")
        if final_decision:
            if final_decision == "reject":
                return ReviewStatus.REJECTED.value
            else:
                # approve, approve_initiator, approve_sme all lead to APPROVED
                return ReviewStatus.APPROVED.value
        return review_db.status

    # Default: no change
    return review_db.status


def calculate_workflow_state(
    review_db: MaterialReviewDB,
    has_assignments: bool,
) -> tuple[int, bool]:
    """Calculate current step index and SME requirement from review state.

    This is the single source of truth for workflow positioning.
    The frontend uses this to initialize step navigation.

    Args:
        review_db: The review database record
        has_assignments: Whether SME and approver are both assigned

    Returns:
        (current_step, sme_required) where:
        - current_step: 0-5 index of the step the review is currently on (6 if completed)
        - sme_required: True if SME review is required based on proposed_action
    """
    # Check if SME review is required based on proposed action
    sme_required = is_sme_required(review_db.proposed_action)

    status = review_db.status

    # Map status to current step
    if status in (ReviewStatus.APPROVED.value, ReviewStatus.REJECTED.value):
        return (6, sme_required)  # All steps complete (terminal states)

    if status == ReviewStatus.CANCELLED.value:
        return (0, sme_required)  # Cancelled, show at start

    if status == ReviewStatus.PENDING_DECISION.value:
        return (5, sme_required)  # On final decision step

    if status == ReviewStatus.PENDING_SME.value:
        return (3, sme_required)  # On SME review step

    if status == ReviewStatus.PENDING_ASSIGNMENT.value:
        return (2, sme_required)  # On assignment step

    # Status is DRAFT - determine step from data presence
    if review_db.completed_checklist:
        # Checklist done but not yet moved to pending_assignment (edge case)
        return (2, sme_required)

    if review_db.review_reason:
        # Step 0 (general info) has data, so user is on step 1 (checklist)
        return (1, sme_required)

    # No data saved yet, user is on step 0
    return (0, sme_required)

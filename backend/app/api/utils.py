from typing import Any, Optional

from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.models.db_models import LookupOptionDB, MaterialReviewDB
from app.models.material import ConsumptionHistory, Material
from app.models.review import ReviewStepEnum
from app.services.workflow import ReviewStateMachine, is_sme_required

# Re-export is_sme_required for backwards compatibility
__all__ = [
    "is_sme_required",
    "get_proposed_action_config",
    "transform_db_record_to_material",
    "determine_status_after_step",
    "calculate_workflow_state",
]


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


# Note: is_sme_required is now imported from app.services.workflow


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

    Delegates to ReviewStateMachine.determine_status_after_step.

    Args:
        step: The step that was just completed
        review_db: The existing review database record
        update_data: The data being updated in this step

    Returns:
        The new status string
    """
    return ReviewStateMachine.determine_status_after_step(step.value, review_db, update_data)


def calculate_workflow_state(
    review_db: MaterialReviewDB,
    has_assignments: bool,
) -> tuple[str, bool]:
    """Calculate current step name and SME requirement from review state.

    Delegates to ReviewStateMachine.get_workflow_state.

    Args:
        review_db: The review database record
        has_assignments: Whether SME and approver are both assigned

    Returns:
        (current_step, sme_required) where:
        - current_step: Step name (e.g., 'general_info', 'checklist', etc.)
        - sme_required: True if SME review is required based on proposed_action
    """
    return ReviewStateMachine.get_workflow_state(review_db, has_assignments)

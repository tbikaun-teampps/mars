from app.models.material import ConsumptionHistory, Material
from app.models.review import (
    ReviewStepEnum,
    ReviewStatus,
)
from app.models.db_models import MaterialReviewDB

from app.models.material import ConsumptionHistory, Material


def transform_db_record_to_material(record: dict) -> Material:
    """Transform a database record into a Material model with computed fields."""
    # Calculate unit_value
    unit_value = None
    if (
        record.get("total_value")
        and record.get("total_quantity")
        and record["total_quantity"] != 0
    ):
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
        consumption_history_5yr = [
            ConsumptionHistory(
                years_ago=years_ago, quantity=qty if qty is not None else 0
            )
            for years_ago, qty in cons_values
        ]

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
        # Step 2: Checklist complete, promote to pending_sme
        return ReviewStatus.PENDING_SME.value

    elif step == ReviewStepEnum.SME_INVESTIGATION:
        # Step 3: SME investigation - check progression
        # If SME responded with recommendation, move to pending_decision
        if update_data.get("sme_responded_date") and update_data.get(
            "sme_recommendation"
        ):
            return ReviewStatus.PENDING_DECISION.value
        # If SME contacted (but not yet responded), move to pending_sme
        elif update_data.get("sme_contacted_date"):
            return ReviewStatus.PENDING_SME.value
        # Otherwise, keep current status
        return review_db.status

    elif step == ReviewStepEnum.FOLLOW_UP:
        # Step 4: Follow-up is optional, no status change
        return review_db.status

    elif step == ReviewStepEnum.FINAL_DECISION:
        # Step 5: Final decision - if decision is made, mark completed
        if update_data.get("final_decision"):
            return ReviewStatus.COMPLETED.value
        return review_db.status

    # Default: no change
    return review_db.status

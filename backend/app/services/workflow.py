"""Review workflow state machine.

This module is the single source of truth for review workflow logic.
All state definitions, transitions, and workflow helpers are centralized here.
"""

from dataclasses import dataclass
from enum import Enum
from typing import TYPE_CHECKING, Any, Callable, Optional

if TYPE_CHECKING:
    from app.models.db_models import MaterialReviewDB


# ============================================================================
# STATE DEFINITIONS
# ============================================================================


class ReviewState(str, Enum):
    """All possible review states."""

    DRAFT = "draft"
    PENDING_ASSIGNMENT = "pending_assignment"
    PENDING_SME = "pending_sme"
    PENDING_DECISION = "pending_decision"
    APPROVED = "approved"
    REJECTED = "rejected"
    CANCELLED = "cancelled"


# State metadata - defines properties for each state
STATES: dict[ReviewState, dict[str, Any]] = {
    ReviewState.DRAFT: {
        "step": "general_info",
        "terminal": False,
        "description": "Review created, general info and checklist phase",
    },
    ReviewState.PENDING_ASSIGNMENT: {
        "step": "assignment",
        "terminal": False,
        "description": "Checklist complete, awaiting SME/approver assignment",
    },
    ReviewState.PENDING_SME: {
        "step": "sme_investigation",
        "terminal": False,
        "description": "Assigned, awaiting SME investigation",
    },
    ReviewState.PENDING_DECISION: {
        "step": "final_decision",
        "terminal": False,
        "description": "SME complete, awaiting approver's final decision",
    },
    ReviewState.APPROVED: {
        "step": "final_decision",
        "terminal": True,
        "description": "Review approved, stock changes executed",
    },
    ReviewState.REJECTED: {
        "step": "final_decision",
        "terminal": True,
        "description": "Review rejected, no stock changes made",
    },
    ReviewState.CANCELLED: {
        "step": "general_info",
        "terminal": True,
        "description": "Review cancelled",
    },
}

# Convenience set of terminal state values for filtering queries
TERMINAL_STATES: set[str] = {
    state.value for state, meta in STATES.items() if meta["terminal"]
}


# ============================================================================
# ACTION DEFINITIONS
# ============================================================================


class Action(str, Enum):
    """Actions that trigger state transitions."""

    COMPLETE_CHECKLIST = "complete_checklist"
    ASSIGN = "assign"
    SUBMIT_SME_REVIEW = "submit_sme_review"
    APPROVE = "approve"
    REJECT = "reject"
    CANCEL = "cancel"


# ============================================================================
# SME REQUIREMENT LOGIC
# ============================================================================

def is_sme_required(
    proposed_action: str | None,
    config: Optional[dict[str, Any]] = None,
) -> bool:
    """Determine if SME review is required based on proposed action.

    Args:
        proposed_action: The proposed action value (e.g., 'keep_no_change')
        config: Optional config dict from lookup_options. If provided,
                uses the 'requires_sme' flag. Otherwise defaults to True.

    Returns:
        True if SME review is required, False otherwise
    """
    if not proposed_action:
        return False

    # If config provided, use the requires_sme flag
    if config is not None:
        return config.get("requires_sme", False)

    # Fallback to default logic
    return True


# ============================================================================
# TRANSITION DEFINITIONS
# ============================================================================


@dataclass
class Transition:
    """A state transition definition.

    Attributes:
        from_state: The state this transition originates from.
                   Use "*" string for wildcard (any non-terminal state).
        action: The action that triggers this transition.
        to_state: The target state. Can be a ReviewState or a callable
                 that takes (review, data) and returns a ReviewState.
        guard: Optional callable that takes (review, data) and returns bool.
               Transition only valid if guard returns True.
    """

    from_state: ReviewState | str  # str for "*" wildcard
    action: Action
    to_state: ReviewState | Callable[["MaterialReviewDB", dict], ReviewState]
    guard: Optional[Callable[["MaterialReviewDB", dict], bool]] = None


def _get_assign_target_state(
    review: "MaterialReviewDB", data: dict
) -> ReviewState:
    """Determine target state after assignment based on SME requirement."""
    # Check if SME review is required
    # The caller should pass config in data if available
    config = data.get("proposed_action_config")
    if is_sme_required(review.proposed_action, config):
        return ReviewState.PENDING_SME
    return ReviewState.PENDING_DECISION


# Transition table - single source of truth for all valid transitions
TRANSITIONS: list[Transition] = [
    # DRAFT -> PENDING_ASSIGNMENT when checklist is completed
    Transition(
        from_state=ReviewState.DRAFT,
        action=Action.COMPLETE_CHECKLIST,
        to_state=ReviewState.PENDING_ASSIGNMENT,
        guard=lambda r, d: r.completed_checklist,
    ),
    # PENDING_ASSIGNMENT -> PENDING_SME or PENDING_DECISION based on SME requirement
    Transition(
        from_state=ReviewState.PENDING_ASSIGNMENT,
        action=Action.ASSIGN,
        to_state=_get_assign_target_state,
    ),
    # PENDING_SME -> PENDING_DECISION when SME submits review
    Transition(
        from_state=ReviewState.PENDING_SME,
        action=Action.SUBMIT_SME_REVIEW,
        to_state=ReviewState.PENDING_DECISION,
        guard=lambda r, d: d.get("sme_recommendation") is not None,
    ),
    # PENDING_DECISION -> APPROVED on approval
    Transition(
        from_state=ReviewState.PENDING_DECISION,
        action=Action.APPROVE,
        to_state=ReviewState.APPROVED,
        guard=lambda r, d: (
            d.get("final_decision") is not None
            and d.get("final_decision") != "reject"
        ),
    ),
    # PENDING_DECISION -> REJECTED on rejection
    Transition(
        from_state=ReviewState.PENDING_DECISION,
        action=Action.REJECT,
        to_state=ReviewState.REJECTED,
        guard=lambda r, d: d.get("final_decision") == "reject",
    ),
    # Any non-terminal state -> CANCELLED
    Transition(
        from_state="*",
        action=Action.CANCEL,
        to_state=ReviewState.CANCELLED,
    ),
]


# ============================================================================
# STATE MACHINE CLASS
# ============================================================================


class ReviewStateMachine:
    """State machine for review workflow.

    This is the single source of truth for:
    - Valid states and their metadata
    - Valid transitions between states
    - SME requirement logic
    - Step <-> State mapping

    All methods are static to allow usage without instantiation.
    """

    @staticmethod
    def is_sme_required(
        proposed_action: str | None,
        config: Optional[dict[str, Any]] = None,
    ) -> bool:
        """Check if SME review is required based on proposed action.

        Args:
            proposed_action: The proposed action value
            config: Optional config dict from lookup_options

        Returns:
            True if SME review is required
        """
        return is_sme_required(proposed_action, config)

    @staticmethod
    def is_terminal(status: str) -> bool:
        """Check if a status is terminal (no further transitions possible).

        Args:
            status: The status string to check

        Returns:
            True if the status is terminal
        """
        try:
            state = ReviewState(status)
            return STATES[state]["terminal"]
        except (ValueError, KeyError):
            return False

    @staticmethod
    def can_edit(status: str) -> bool:
        """Check if a review in this status can be edited.

        Args:
            status: The status string to check

        Returns:
            True if the review can be edited (i.e., not terminal)
        """
        return not ReviewStateMachine.is_terminal(status)

    @staticmethod
    def get_step_for_status(status: str) -> str:
        """Get the step name for a given status.

        Args:
            status: The status string

        Returns:
            The step name (e.g., 'general_info', 'checklist', etc.)
        """
        try:
            state = ReviewState(status)
            return STATES[state]["step"]
        except (ValueError, KeyError):
            return "general_info"

    @staticmethod
    def get_state_metadata(status: str) -> dict[str, Any] | None:
        """Get metadata for a given status.

        Args:
            status: The status string

        Returns:
            The state metadata dict, or None if invalid status
        """
        try:
            state = ReviewState(status)
            return STATES[state]
        except (ValueError, KeyError):
            return None

    @staticmethod
    def get_valid_actions(from_status: str) -> list[Action]:
        """Get list of valid actions from a given status.

        Args:
            from_status: The current status string

        Returns:
            List of valid Action enums
        """
        if ReviewStateMachine.is_terminal(from_status):
            return []

        valid = []
        for t in TRANSITIONS:
            if t.from_state == "*" or (
                isinstance(t.from_state, ReviewState)
                and t.from_state.value == from_status
            ):
                valid.append(t.action)
        return valid

    @staticmethod
    def get_next_status(
        current_status: str,
        action: Action,
        review: "MaterialReviewDB",
        data: dict,
    ) -> str | None:
        """Get the next status for a given action.

        Args:
            current_status: The current status string
            action: The action being performed
            review: The review database record
            data: Additional data for guards and dynamic transitions

        Returns:
            The next status string, or None if transition is not valid
        """
        if ReviewStateMachine.is_terminal(current_status):
            return None

        for t in TRANSITIONS:
            # Match state (exact or wildcard)
            state_match = t.from_state == "*" or (
                isinstance(t.from_state, ReviewState)
                and t.from_state.value == current_status
            )
            if not state_match:
                continue

            # Match action
            if t.action != action:
                continue

            # Check guard condition
            if t.guard and not t.guard(review, data):
                continue

            # Get target state
            if callable(t.to_state):
                return t.to_state(review, data).value
            return t.to_state.value

        return None

    @staticmethod
    def can_transition(
        current_status: str,
        action: Action,
        review: "MaterialReviewDB",
        data: dict,
    ) -> bool:
        """Check if a transition is valid.

        Args:
            current_status: The current status string
            action: The action to perform
            review: The review database record
            data: Additional data for guards

        Returns:
            True if the transition is valid
        """
        return (
            ReviewStateMachine.get_next_status(current_status, action, review, data)
            is not None
        )

    @staticmethod
    def get_workflow_state(
        review: "MaterialReviewDB",
        has_assignments: bool = False,
    ) -> tuple[str, bool]:
        """Calculate current step name and SME requirement from review state.

        This is the single source of truth for workflow positioning.
        The frontend uses this to initialize step navigation.

        Args:
            review: The review database record
            has_assignments: Whether SME and approver are both assigned

        Returns:
            (current_step, sme_required) where:
            - current_step: Step name (e.g., 'general_info', 'checklist', etc.)
            - sme_required: True if SME review is required based on proposed_action
        """
        sme_required = ReviewStateMachine.is_sme_required(review.proposed_action)
        status = review.status

        # Get base step from state metadata
        step = ReviewStateMachine.get_step_for_status(status)

        # Handle DRAFT sub-steps based on data presence
        if status == ReviewState.DRAFT.value:
            if review.completed_checklist:
                # Checklist done but not yet moved to pending_assignment (edge case)
                step = "assignment"
            elif review.review_reason:
                # general_info has data, so user is on checklist step
                step = "checklist"
            else:
                # No data saved yet, user is on general_info step
                step = "general_info"

        return (step, sme_required)

    @staticmethod
    def determine_status_after_step(
        step: str,
        review: "MaterialReviewDB",
        update_data: dict,
    ) -> str:
        """Determine new status based on completed step and data.

        This maps UI steps to workflow actions and executes the appropriate
        transition.

        Args:
            step: The step index that was just completed (0-5)
            review: The review database record
            update_data: The data being updated in this step

        Returns:
            The new status string (may be unchanged if no transition)
        """
        current = review.status

        # Map step name -> action
        # general_info: no status change (stays DRAFT)
        # checklist: COMPLETE_CHECKLIST action
        # assignment: ASSIGN action (handled separately in assignments.py)
        # sme_investigation: SUBMIT_SME_REVIEW action
        # follow_up: no status change (optional step)
        # final_decision: APPROVE or REJECT action

        if step == "general_info":
            # General info - no status change
            return current

        if step == "checklist":
            # Checklist completion
            next_status = ReviewStateMachine.get_next_status(
                current, Action.COMPLETE_CHECKLIST, review, update_data
            )
            return next_status or current

        if step == "assignment":
            # Assignment - this is typically handled by assignments.py directly
            # but we support it here for completeness
            next_status = ReviewStateMachine.get_next_status(
                current, Action.ASSIGN, review, update_data
            )
            return next_status or current

        if step == "sme_investigation":
            # SME Investigation
            # Check if SME has provided recommendation
            if update_data.get("sme_recommendation"):
                next_status = ReviewStateMachine.get_next_status(
                    current, Action.SUBMIT_SME_REVIEW, review, update_data
                )
                return next_status or current
            # SME hasn't provided recommendation yet - keep current status
            return current

        if step == "follow_up":
            # Follow-up - no status change (optional step)
            return current

        if step == "final_decision":
            # Final decision
            final_decision = update_data.get("final_decision")
            if final_decision:
                if final_decision == "reject":
                    next_status = ReviewStateMachine.get_next_status(
                        current, Action.REJECT, review, update_data
                    )
                else:
                    # approve, approve_initiator, approve_sme all lead to APPROVED
                    next_status = ReviewStateMachine.get_next_status(
                        current, Action.APPROVE, review, update_data
                    )
                return next_status or current
            return current

        # Default: no change
        return current


# ============================================================================
# CONVENIENCE EXPORTS
# ============================================================================

# Export commonly used items at module level
__all__ = [
    "ReviewState",
    "STATES",
    "TERMINAL_STATES",
    "Action",
    "Transition",
    "TRANSITIONS",
    "ReviewStateMachine",
    "is_sme_required",
]
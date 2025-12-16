"""Material review models."""

from datetime import date, datetime
from enum import Enum
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field

from app.models.user import UserProfile


class ReviewStatus(str, Enum):
    """Review status options."""

    DRAFT = "draft"
    PENDING_SME = "pending_sme"
    PENDING_DECISION = "pending_decision"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class MaterialStatus(str, Enum):
    """Material status options."""

    SURPLUS = "surplus"
    DEAD_STOCK = "dead stock"
    EXPIRED = "expired/ out of life"
    OTHER = "other"


class DisposalMethod(str, Enum):
    """Disposal method options."""

    REUSE = "re-use"
    RETURN = "return"
    SELL = "sell"
    RECYCLE = "recycle"
    SCRAP = "scrap"


class ReviewChecklist(BaseModel):
    """Review checklist data."""

    has_open_orders: bool
    has_forecast_demand: bool
    checked_alternate_plants: bool
    contacted_procurement: bool
    reviewed_bom_usage: bool
    checked_supersession: bool
    checked_historical_usage: bool
    open_order_numbers: Optional[str] = None
    forecast_next_12m: Optional[float] = None
    alternate_plant_qty: Optional[float] = None
    procurement_feedback: Optional[str] = None


class MaterialReview(BaseModel):
    """Material review model."""

    review_id: Optional[int] = None
    material_number: int

    created_by: Optional[UUID] = None
    last_updated_by: Optional[UUID] = None
    created_at: datetime
    updated_at: datetime

    # Initiator info
    initiated_by: UUID
    initiated_by_user: Optional[UserProfile] = None
    review_date: date

    # Structured form fields
    review_reason: Optional[str] = None
    current_stock_qty: Optional[float] = None
    current_stock_value: Optional[float] = None
    months_no_movement: Optional[int] = None
    proposed_action: Optional[str] = None
    proposed_safety_stock_qty: Optional[float] = None
    proposed_unrestricted_qty: Optional[float] = None
    business_justification: Optional[str] = None

    # SME investigation results
    sme_name: Optional[str] = None
    sme_email: Optional[str] = None
    sme_department: Optional[str] = None
    sme_feedback_method: Optional[str] = None
    sme_contacted_date: Optional[datetime] = None
    sme_responded_date: Optional[datetime] = None
    sme_recommendation: Optional[str] = None
    sme_recommended_safety_stock_qty: Optional[float] = None
    sme_recommended_unrestricted_qty: Optional[float] = None
    sme_analysis: Optional[str] = None
    alternative_applications: Optional[str] = None
    risk_assessment: Optional[str] = None

    # Final decision
    final_decision: Optional[str] = None
    final_safety_stock_qty: Optional[float] = None
    final_unrestricted_qty: Optional[float] = None
    final_notes: Optional[str] = None
    decided_by: Optional[UUID] = None
    decided_by_user: Optional[UserProfile] = None
    decided_at: Optional[datetime] = None

    # Follow-up scheduling
    requires_follow_up: Optional[bool] = None
    next_review_date: Optional[date] = None
    follow_up_reason: Optional[str] = None
    review_frequency_weeks: Optional[int] = None

    # Link to previous review
    previous_review_id: Optional[int] = None

    # Additional tracking
    estimated_savings: Optional[float] = None
    implementation_date: Optional[date] = None

    # Workflow status
    status: ReviewStatus = ReviewStatus.DRAFT
    completed_checklist: bool = False

    # Checklist data (joined from review_checklist table)
    checklist: Optional[ReviewChecklist] = None

    is_read_only: Optional[bool] = False  # Computed property for UI logic
    comments_count: Optional[int] = 0  # Number of comments on this review


class MaterialReviewCreate(BaseModel):
    """Material review creation model (without material_number, which comes from URL)."""

    # Structured form fields (required for creating a review)
    review_reason: Optional[str] = None
    current_stock_qty: Optional[float] = None
    current_stock_value: Optional[float] = None
    months_no_movement: Optional[int] = None
    proposed_action: Optional[str] = None
    proposed_safety_stock_qty: Optional[float] = None
    proposed_unrestricted_qty: Optional[float] = None
    business_justification: Optional[str] = None

    # SME investigation results (can be added at creation or later)
    sme_name: Optional[str] = None
    sme_email: Optional[str] = None
    sme_department: Optional[str] = None
    sme_feedback_method: Optional[str] = None
    sme_contacted_date: Optional[datetime] = None
    sme_responded_date: Optional[datetime] = None
    sme_recommendation: Optional[str] = None
    sme_recommended_safety_stock_qty: Optional[float] = None
    sme_recommended_unrestricted_qty: Optional[float] = None
    sme_analysis: Optional[str] = None
    alternative_applications: Optional[str] = None
    risk_assessment: Optional[str] = None

    # Final decision (typically added later in workflow)
    final_decision: Optional[str] = None
    final_safety_stock_qty: Optional[float] = None
    final_unrestricted_qty: Optional[float] = None
    final_notes: Optional[str] = None

    # Follow-up scheduling
    requires_follow_up: Optional[bool] = None
    next_review_date: Optional[date] = None
    follow_up_reason: Optional[str] = None
    review_frequency_weeks: Optional[int] = None

    # Link to previous review
    previous_review_id: Optional[int] = None

    # Additional tracking
    estimated_savings: Optional[float] = None
    implementation_date: Optional[date] = None


class MaterialReviewUpdate(BaseModel):
    """Material review update model (all fields optional for partial updates)."""

    # Structured form fields
    review_reason: Optional[str] = None
    current_stock_qty: Optional[float] = None
    current_stock_value: Optional[float] = None
    months_no_movement: Optional[int] = None
    proposed_action: Optional[str] = None
    proposed_safety_stock_qty: Optional[float] = None
    proposed_unrestricted_qty: Optional[float] = None
    business_justification: Optional[str] = None

    # Checklist data
    has_open_orders: Optional[bool] = None
    has_forecast_demand: Optional[bool] = None
    checked_alternate_plants: Optional[bool] = None
    contacted_procurement: Optional[bool] = None
    reviewed_bom_usage: Optional[bool] = None
    checked_supersession: Optional[bool] = None
    checked_historical_usage: Optional[bool] = None
    # Checklist optional context fields
    open_order_numbers: Optional[str] = None
    forecast_next_12m: Optional[float] = None
    alternate_plant_qty: Optional[float] = None
    procurement_feedback: Optional[str] = None

    # SME investigation results
    sme_name: Optional[str] = None
    sme_email: Optional[str] = None
    sme_department: Optional[str] = None
    sme_feedback_method: Optional[str] = None
    sme_contacted_date: Optional[datetime] = None
    sme_responded_date: Optional[datetime] = None
    sme_recommendation: Optional[str] = None
    sme_recommended_safety_stock_qty: Optional[float] = None
    sme_recommended_unrestricted_qty: Optional[float] = None
    sme_analysis: Optional[str] = None
    alternative_applications: Optional[str] = None
    risk_assessment: Optional[str] = None

    # Final decision
    final_decision: Optional[str] = None
    final_safety_stock_qty: Optional[float] = None
    final_unrestricted_qty: Optional[float] = None
    final_notes: Optional[str] = None
    decided_at: Optional[datetime] = None

    # Follow-up scheduling
    requires_follow_up: Optional[bool] = None
    next_review_date: Optional[date] = None
    follow_up_reason: Optional[str] = None
    review_frequency_weeks: Optional[int] = None

    # Link to previous review
    previous_review_id: Optional[int] = None

    # Additional tracking
    estimated_savings: Optional[float] = None
    implementation_date: Optional[date] = None

    # Workflow status
    status: Optional[ReviewStatus] = None


class ReviewStatusChange(BaseModel):
    """Model for changing review status."""

    status: ReviewStatus
    changed_by: UUID


class ReviewStepEnum(str, Enum):
    """Review step options for multi-step form workflow."""

    GENERAL_INFO = "general_info"
    CHECKLIST = "checklist"
    SME_INVESTIGATION = "sme_investigation"
    FOLLOW_UP = "follow_up"
    FINAL_DECISION = "final_decision"


class Step1GeneralInfoPayload(BaseModel):
    """Step 1: General Information payload."""

    review_reason: str = Field(..., min_length=1)
    current_stock_qty: float = Field(..., ge=0)
    current_stock_value: float = Field(..., ge=0)
    months_no_movement: int = Field(..., ge=0)
    proposed_action: str = Field(..., min_length=1)
    proposed_safety_stock_qty: Optional[float] = None
    proposed_unrestricted_qty: Optional[float] = None
    business_justification: str = Field(..., min_length=10)


class Step2ChecklistPayload(BaseModel):
    """Step 2: Checklist verification payload."""

    # Required boolean checks
    has_open_orders: bool
    has_forecast_demand: bool
    checked_alternate_plants: bool
    contacted_procurement: bool
    reviewed_bom_usage: bool
    checked_supersession: bool
    checked_historical_usage: bool

    # Optional context fields
    open_order_numbers: Optional[str] = None
    forecast_next_12m: Optional[float] = None
    alternate_plant_qty: Optional[float] = None
    procurement_feedback: Optional[str] = None


class Step3SMEPayload(BaseModel):
    """Step 3: SME Investigation payload."""

    sme_name: str = Field(..., min_length=1)
    sme_email: str = Field(..., min_length=1)
    sme_department: str = Field(..., min_length=1)
    sme_feedback_method: str = Field(..., min_length=1)
    sme_contacted_date: Optional[datetime] = None
    sme_responded_date: Optional[datetime] = None
    sme_recommendation: Optional[str] = None
    sme_recommended_safety_stock_qty: Optional[float] = None
    sme_recommended_unrestricted_qty: Optional[float] = None
    sme_analysis: Optional[str] = None
    alternative_applications: Optional[str] = None
    risk_assessment: Optional[str] = None


class Step4FollowUpPayload(BaseModel):
    """Step 4: Follow-up scheduling payload."""

    requires_follow_up: Optional[bool] = None
    next_review_date: Optional[date] = None
    follow_up_reason: Optional[str] = None
    review_frequency_weeks: Optional[int] = None


class Step5FinalDecisionPayload(BaseModel):
    """Step 5: Final decision payload."""

    final_decision: str = Field(..., min_length=1)
    final_safety_stock_qty: Optional[float] = None
    final_unrestricted_qty: Optional[float] = None
    final_notes: Optional[str] = None
    estimated_savings: Optional[float] = Field(None, ge=0)
    implementation_date: Optional[date] = None

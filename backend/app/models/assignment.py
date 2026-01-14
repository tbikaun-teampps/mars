"""Review assignment models."""

from datetime import datetime
from enum import Enum
from typing import Optional
from uuid import UUID

from pydantic import BaseModel


class AssignmentType(str, Enum):
    """Assignment type options."""

    OWNER = "owner"
    SME = "sme"
    APPROVER = "approver"
    WATCHER = "watcher"


class AssignmentStatus(str, Enum):
    """Assignment status options."""

    PENDING = "pending"
    ACCEPTED = "accepted"
    DECLINED = "declined"
    COMPLETED = "completed"
    REASSIGNED = "reassigned"
    CANCELLED = "cancelled"


class ReviewAssignmentCreate(BaseModel):
    """Create a single assignment request."""

    user_id: UUID
    assignment_type: AssignmentType
    sme_type: Optional[str] = None
    due_at: Optional[datetime] = None


class ReviewAssignmentUpdate(BaseModel):
    """Update assignment request."""

    user_id: Optional[UUID] = None
    status: Optional[AssignmentStatus] = None
    response_notes: Optional[str] = None


class ReviewAssignmentResponse(BaseModel):
    """Assignment response with user details."""

    assignment_id: int
    review_id: int
    user_id: UUID
    user_name: Optional[str] = None
    user_email: Optional[str] = None
    assignment_type: str
    sme_type: Optional[str] = None
    status: str
    assigned_at: datetime
    due_at: Optional[datetime] = None
    accepted_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    assigned_by: UUID
    assigned_by_name: Optional[str] = None


class AssignmentStepPayload(BaseModel):
    """Payload for the assignment step (Step 3) - creates SME (if required) and approver assignments."""

    sme_user_id: Optional[UUID] = None  # Optional - only required when SME review is needed
    approver_user_id: UUID
    sme_due_at: Optional[datetime] = None
    approver_due_at: Optional[datetime] = None


class UserWithPermission(BaseModel):
    """User response for permission-based user picker."""

    user_id: UUID
    full_name: str
    email: Optional[str] = None
    sme_type: Optional[str] = None
    sme_types: Optional[list[str]] = None  # For users with multiple SME types


class MyAssignmentResponse(BaseModel):
    """Assignment response for the My Reviews page, includes material and review details."""

    assignment_id: int
    assignment_type: str  # 'sme' | 'approver'
    status: str
    assigned_at: datetime
    due_at: Optional[datetime] = None
    # Material info
    material_number: int
    material_description: Optional[str] = None
    # Review info
    review_id: int
    review_status: str
    # Assigned by
    assigned_by_name: Optional[str] = None


class MyInitiatedReviewResponse(BaseModel):
    """Response for reviews initiated by the current user."""

    review_id: int
    material_number: int
    material_description: Optional[str] = None
    status: str  # review status (draft, pending_sme, etc.)
    proposed_action: Optional[str] = None
    review_date: datetime
    created_at: datetime

"""Role-based access control Pydantic models."""

from datetime import date, datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

# ============================================================================
# ROLE MODELS (Read-only)
# ============================================================================


class RoleListItem(BaseModel):
    """Simplified role for lists."""

    model_config = ConfigDict(from_attributes=True)

    role_id: int
    role_code: str
    role_name: str
    role_type: str
    description: Optional[str] = None
    is_active: bool


class RoleResponse(BaseModel):
    """Role response with all details."""

    model_config = ConfigDict(from_attributes=True)

    role_id: int
    role_code: str
    role_name: str
    role_type: str
    description: Optional[str] = None

    can_create_reviews: bool
    can_edit_reviews: bool
    can_delete_reviews: bool
    can_approve_reviews: bool
    can_provide_sme_review: bool
    can_assign_reviews: bool
    can_manage_users: bool
    can_manage_settings: bool
    can_view_all_reviews: bool
    can_export_data: bool
    can_manage_acknowledgements: bool

    approval_limit: Optional[float] = None
    is_active: bool


# ============================================================================
# USER-ROLE ASSIGNMENT MODELS
# ============================================================================


class UserRoleCreate(BaseModel):
    """Create user-role assignment."""

    user_id: UUID
    role_id: int
    valid_from: Optional[date] = None
    valid_to: Optional[date] = None


class UserRoleUpdate(BaseModel):
    """Update user-role assignment (validity period only)."""

    valid_from: Optional[date] = None
    valid_to: Optional[date] = None


class UserRoleResponse(BaseModel):
    """User-role assignment response."""

    user_role_id: int
    user_id: UUID
    user_name: Optional[str] = None
    user_email: Optional[str] = None
    role_id: int
    role_code: str
    role_name: str
    role_type: str
    valid_from: Optional[date] = None
    valid_to: Optional[date] = None
    assigned_by: Optional[UUID] = None
    assigned_by_name: Optional[str] = None
    assigned_at: datetime
    is_active: bool


class UserRoleHistoryResponse(BaseModel):
    """User-role change history."""

    history_id: int
    user_role_id: int
    action: str
    old_values: Optional[dict] = None
    new_values: Optional[dict] = None
    performed_by: UUID
    performed_by_name: Optional[str] = None
    performed_at: datetime


# ============================================================================
# SME EXPERTISE MODELS
# ============================================================================


class SMEExpertiseCreate(BaseModel):
    """Create SME expertise record."""

    user_id: UUID
    sme_type: str = Field(..., min_length=1, max_length=50)
    material_group: Optional[str] = Field(default=None, max_length=50)
    plant: Optional[str] = Field(default=None, max_length=50)
    max_concurrent_reviews: int = Field(default=10, ge=1, le=100)
    backup_user_id: Optional[UUID] = None


class SMEExpertiseUpdate(BaseModel):
    """Update SME expertise record."""

    sme_type: Optional[str] = Field(default=None, max_length=50)
    material_group: Optional[str] = Field(default=None, max_length=50)
    plant: Optional[str] = Field(default=None, max_length=50)
    max_concurrent_reviews: Optional[int] = Field(default=None, ge=1, le=100)
    is_available: Optional[bool] = None
    unavailable_until: Optional[date] = None
    unavailable_reason: Optional[str] = Field(default=None, max_length=200)
    backup_user_id: Optional[UUID] = None


class SMEExpertiseResponse(BaseModel):
    """SME expertise response."""

    expertise_id: int
    user_id: UUID
    user_name: Optional[str] = None
    user_email: Optional[str] = None
    sme_type: str
    sme_type_label: Optional[str] = None
    material_group: Optional[str] = None
    plant: Optional[str] = None
    max_concurrent_reviews: int
    current_review_count: int
    is_available: bool
    unavailable_until: Optional[date] = None
    unavailable_reason: Optional[str] = None
    backup_user_id: Optional[UUID] = None
    backup_user_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime


# ============================================================================
# USER MODELS (for picker)
# ============================================================================


class UserListItem(BaseModel):
    """User list item for picker components."""

    user_id: UUID
    full_name: Optional[str] = None
    email: Optional[str] = None
    is_active: bool = True

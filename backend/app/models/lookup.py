"""Lookup option models for configurable dropdown options."""

from datetime import datetime
from typing import Any, Optional
from uuid import UUID

from pydantic import BaseModel, Field


class LookupOption(BaseModel):
    """Lookup option response model."""

    option_id: Optional[int] = None
    category: str
    value: str
    label: str
    description: Optional[str] = None
    color: Optional[str] = None

    # Grouping & ordering
    group_name: Optional[str] = None
    group_order: int = 0
    sort_order: int = 0

    is_active: bool = True

    # Category-specific configuration (e.g., workflow flags for proposed_action)
    config: Optional[dict[str, Any]] = None

    # Audit fields
    created_by: Optional[UUID] = None
    created_at: Optional[datetime] = None
    updated_by: Optional[UUID] = None
    updated_at: Optional[datetime] = None


class LookupOptionCreate(BaseModel):
    """Create lookup option request model."""

    category: str = Field(..., min_length=1, max_length=50)
    value: str = Field(..., min_length=1, max_length=100)
    label: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    color: Optional[str] = Field(default=None, max_length=7, pattern=r"^#[0-9A-Fa-f]{6}$")

    # Grouping & ordering
    group_name: Optional[str] = Field(default=None, max_length=100)
    group_order: int = Field(default=0, ge=0)
    sort_order: int = Field(default=0, ge=0)

    # Category-specific configuration (e.g., workflow flags for proposed_action)
    config: Optional[dict[str, Any]] = None


class LookupOptionUpdate(BaseModel):
    """Update lookup option request model (partial update)."""

    label: Optional[str] = Field(default=None, min_length=1, max_length=200)
    description: Optional[str] = None
    color: Optional[str] = Field(default=None, max_length=7, pattern=r"^#[0-9A-Fa-f]{6}$")

    # Grouping & ordering
    group_name: Optional[str] = Field(default=None, max_length=100)
    group_order: Optional[int] = Field(default=None, ge=0)
    sort_order: Optional[int] = Field(default=None, ge=0)

    is_active: Optional[bool] = None

    # Category-specific configuration (e.g., workflow flags for proposed_action)
    config: Optional[dict[str, Any]] = None


class LookupOptionHistory(BaseModel):
    """Lookup option history response model."""

    history_id: int
    option_id: int
    change_type: str  # created, updated, deactivated, reactivated
    old_values: Optional[dict] = None
    new_values: Optional[dict] = None
    changed_by: Optional[UUID] = None
    changed_at: datetime


class LookupOptionInGroup(BaseModel):
    """Lookup option within a group (includes option_id for CRUD operations)."""

    option_id: int
    value: str
    label: str
    description: Optional[str] = None
    color: Optional[str] = None
    sort_order: int = 0
    is_active: bool = True
    config: Optional[dict[str, Any]] = None


class LookupOptionGroup(BaseModel):
    """Group of lookup options for dropdown rendering."""

    group_name: Optional[str] = None
    group_order: int = 0
    options: list[LookupOptionInGroup] = []


class LookupOptionsGrouped(BaseModel):
    """Lookup options grouped by group_name for dropdown rendering."""

    category: str
    groups: list[LookupOptionGroup] = []
    # Also include flat list for convenience
    options: list[LookupOptionInGroup] = []

"""Audit log models."""

from datetime import datetime
from typing import Any, Optional
from uuid import UUID

from pydantic import BaseModel

from app.models.user import UserProfile


class AuditLogEntry(BaseModel):
    """Audit log entry model."""

    audit_id: int
    table_name: str
    record_id: int
    operation: str  # INSERT, UPDATE, DELETE
    old_values: Optional[dict[str, Any]] = None
    new_values: Optional[dict[str, Any]] = None
    fields_changed: Optional[list[str]] = None
    changed_by: UUID
    changed_at: datetime


class PaginatedAuditLogsResponse(BaseModel):
    """Paginated audit logs response."""

    items: list[AuditLogEntry]
    total: int
    skip: int
    limit: int


class MaterialAuditLogEntry(BaseModel):
    """Human-readable material audit log entry."""

    audit_id: int
    timestamp: datetime
    material_number: int
    material_desc: Optional[str] = None
    change_summary: str
    changed_by: Optional[str] = None
    changed_by_user: Optional[UserProfile] = None
    table_name: str
    operation: str


class PaginatedMaterialAuditLogsResponse(BaseModel):
    """Paginated material audit logs response."""

    items: list[MaterialAuditLogEntry]
    total: int
    skip: int
    limit: int

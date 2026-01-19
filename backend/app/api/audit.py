"""Audit log endpoints."""

from datetime import datetime
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy import String, cast, or_
from sqlmodel import func, select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.auth import User, get_current_user
from app.core.database import get_db
from app.models.audit import (
    AuditLogEntry,
    MaterialAuditLogEntry,
    PaginatedAuditLogsResponse,
    PaginatedMaterialAuditLogsResponse,
)
from app.models.db_models import (
    AuditLogDB,
    MaterialInsightDB,
    MaterialReviewDB,
    ProfileDB,
    ReviewChecklistDB,
    SAPMaterialData,
)
from app.models.user import UserProfile

router = APIRouter()


@router.get("/audit-logs")
async def list_audit_logs(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    skip: int = Query(0, ge=0, description="Number of items to skip"),
    limit: int = Query(50, ge=1, le=500, description="Maximum number of items to return"),
    table_name: Optional[str] = Query(None, description="Filter by table name"),
    record_id: Optional[int] = Query(None, description="Filter by record ID"),
    operation: Optional[str] = Query(None, description="Filter by operation (INSERT, UPDATE, DELETE)"),
    changed_by: Optional[str] = Query(None, description="Filter by user who made the change"),
    date_from: Optional[datetime] = Query(None, description="Filter by date from (inclusive)"),
    date_to: Optional[datetime] = Query(None, description="Filter by date to (inclusive)"),
) -> PaginatedAuditLogsResponse:
    """List audit logs with pagination and filtering."""

    # Build base query
    query = select(AuditLogDB)

    # Apply filters
    if table_name:
        query = query.where(AuditLogDB.table_name == table_name)

    if record_id is not None:
        query = query.where(AuditLogDB.record_id == record_id)

    if operation:
        query = query.where(AuditLogDB.operation == operation.upper())

    if changed_by:
        query = query.where(AuditLogDB.changed_by == changed_by)

    if date_from:
        query = query.where(AuditLogDB.changed_at >= date_from)

    if date_to:
        query = query.where(AuditLogDB.changed_at <= date_to)

    # Get total count before pagination
    count_query = select(func.count()).select_from(AuditLogDB)

    # Apply same filters to count query
    if table_name:
        count_query = count_query.where(AuditLogDB.table_name == table_name)
    if record_id is not None:
        count_query = count_query.where(AuditLogDB.record_id == record_id)
    if operation:
        count_query = count_query.where(AuditLogDB.operation == operation.upper())
    if changed_by:
        count_query = count_query.where(AuditLogDB.changed_by == changed_by)
    if date_from:
        count_query = count_query.where(AuditLogDB.changed_at >= date_from)
    if date_to:
        count_query = count_query.where(AuditLogDB.changed_at <= date_to)

    total_result = await db.exec(count_query)
    total = total_result.one()

    # Apply sorting (most recent first)
    query = query.order_by(AuditLogDB.changed_at.desc())

    # Apply pagination
    query = query.offset(skip).limit(limit)

    # Execute query
    results = await db.exec(query)
    audit_logs_data = results.all()

    # Transform database records to AuditLogEntry models
    audit_logs = [
        AuditLogEntry(
            audit_id=log.audit_id,
            table_name=log.table_name,
            record_id=log.record_id,
            operation=log.operation,
            old_values=log.old_values,
            new_values=log.new_values,
            changed_by=log.changed_by,
            changed_at=log.changed_at,
        )
        for log in audit_logs_data
    ]

    return PaginatedAuditLogsResponse(
        items=audit_logs,
        total=total,
        skip=skip,
        limit=limit,
    )


def generate_change_summary(
    operation: str,
    table_name: str,
    fields_changed: Optional[list[str]],
    old_values: Optional[dict] = None,
    new_values: Optional[dict] = None,
) -> str:
    """Generate a human-readable summary of changes."""
    if operation == "INSERT":
        if table_name == "sap_material_data":
            return "Created material"
        elif table_name == "material_reviews":
            return "Added new review"
        elif table_name == "review_checklist":
            return "Completed checklist verification"
        elif table_name == "material_insights":
            return "Generated insight"
        return f"Created {table_name} record"

    # Handle insight acknowledgement updates
    if table_name == "material_insights" and fields_changed:
        if "acknowledged_at" in fields_changed:
            if new_values and new_values.get("acknowledged_at"):
                return "Acknowledged insight"
            else:
                return "Removed insight acknowledgement"

    # UPDATE operation
    if not fields_changed or len(fields_changed) == 0:
        return "No changes"

    # Generate readable field names
    field_map = {
        "material_desc": "description",
        "material_type": "type",
        "safety_stock": "safety stock",
        "total_quantity": "quantity",
        "total_value": "value",
        "initiated_by": "initiated by",
        "review_date": "review date",
        "review_reason": "review reason",
        "current_stock_qty": "current stock quantity",
        "current_stock_value": "current stock value",
        "months_no_movement": "months without movement",
        "proposed_action": "proposed action",
        "proposed_qty_adjustment": "proposed quantity adjustment",
        "business_justification": "business justification",
        "sme_recommendation": "SME recommendation",
        "sme_analysis": "SME analysis",
        "final_decision": "final decision",
        "final_qty_adjustment": "final quantity adjustment",
        "final_notes": "final notes",
        "next_review_date": "next review date",
        "requires_follow_up": "requires follow-up",
        "follow_up_reason": "follow-up reason",
        "review_frequency_weeks": "review frequency (weeks)",
        "estimated_savings": "estimated savings",
        "implementation_date": "implementation date",
        # "status": "status",
        "checklist_completed": "checklist completed",
        # Checklist boolean fields (from review_checklist table)
        "has_open_orders": "open orders check",
        "has_forecast_demand": "forecast demand check",
        "checked_alternate_plants": "alternate plants check",
        "contacted_procurement": "procurement consultation",
        "reviewed_bom_usage": "BOM usage review",
        "checked_supersession": "supersession check",
        "checked_historical_usage": "historical usage review",
        # Checklist context fields
        "open_order_numbers": "open order numbers",
        "forecast_next_12m": "12-month forecast",
        "alternate_plant_qty": "alternate plant quantity",
        "procurement_feedback": "procurement feedback",
    }

    # Filter to only include fields that are in the field_map
    # This excludes internal tracking fields like updated_at, created_at, last_updated_by, created_by
    mapped_fields = [f for f in fields_changed if f in field_map]

    # If no mapped fields, only internal fields were updated
    if not mapped_fields:
        return "Updated internal fields"

    readable_fields = [field_map[f] for f in mapped_fields]

    readable_value_changes = [f"({old_values.get(f, 'N/A')} to {new_values.get(f, 'N/A')})" for f in mapped_fields]

    if len(readable_fields) == 1:
        return f"Updated {readable_fields[0]} {readable_value_changes[0]}"
    elif len(readable_fields) == 2:
        return f"Updated {readable_fields[0]} {readable_value_changes[0]} and {readable_fields[1]} {readable_value_changes[1]}"
    else:
        changes = ", ".join([f"{readable_fields[i]} {readable_value_changes[i]}" for i in range(len(readable_fields) - 1)])
        return f"Updated {changes}, and {readable_fields[-1]} {readable_value_changes[-1]}"


@router.get("/audit-logs/materials")
async def list_material_audit_logs(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    skip: int = Query(0, ge=0, description="Number of items to skip"),
    limit: int = Query(50, ge=1, le=500, description="Maximum number of items to return"),
    material_number: Optional[int] = Query(None, description="Filter by material number"),
    date_from: Optional[datetime] = Query(None, description="Filter by date from (inclusive)"),
    date_to: Optional[datetime] = Query(None, description="Filter by date to (inclusive)"),
    search: Optional[str] = Query(None, description="Search material number or description"),
    sort_by: Optional[str] = Query(None, description="Field to sort by (timestamp, material_number)"),
    sort_order: Optional[str] = Query("desc", description="Sort order: asc or desc"),
    changed_by_user_id: Optional[UUID] = Query(None, description="Filter by user who made the change"),
) -> PaginatedMaterialAuditLogsResponse:
    """List material-related audit logs in a human-readable format."""

    # Build base query for material-related tables
    query = (
        select(AuditLogDB, ProfileDB)
        .where(AuditLogDB.table_name.in_(["sap_material_data", "material_reviews", "review_checklist", "material_insights"]))
        .outerjoin(ProfileDB, AuditLogDB.changed_by == ProfileDB.id)
    )

    # Apply date filters
    if date_from:
        query = query.where(AuditLogDB.changed_at >= date_from)
    if date_to:
        query = query.where(AuditLogDB.changed_at <= date_to)

    # Apply user filter
    if changed_by_user_id:
        query = query.where(AuditLogDB.changed_by == changed_by_user_id)

    # Apply search filter (searches material_number in sap_material_data records)
    # Also searches on user name
    if search:
        search_pattern = f"%{search}%"
        # Search on record_id for sap_material_data (which is material_number)
        # Also search on user name if profile exists
        query = query.where(
            or_(
                (AuditLogDB.table_name == "sap_material_data") & (cast(AuditLogDB.record_id, String).ilike(search_pattern)),
                ProfileDB.full_name.ilike(search_pattern),
            )
        )

    # For material_number filter, we need to handle four tables differently
    if material_number is not None:
        # For sap_material_data, record_id is material_number
        # For material_reviews, we need to get review_ids for the material
        # For review_checklist, we need to get checklist_ids for those review_ids
        # For material_insights, we need to get insight_ids for the material
        material_review_ids_query = select(MaterialReviewDB.review_id).where(MaterialReviewDB.material_number == material_number)
        material_review_ids_result = await db.exec(material_review_ids_query)
        material_review_ids = [row for row in material_review_ids_result.all()]

        # Get checklist_ids for the review_ids
        checklist_ids = []
        if material_review_ids:
            checklist_ids_query = select(ReviewChecklistDB.checklist_id).where(ReviewChecklistDB.review_id.in_(material_review_ids))
            checklist_ids_result = await db.exec(checklist_ids_query)
            checklist_ids = [row for row in checklist_ids_result.all()]

        # Get insight_ids for the material
        insight_ids_query = select(MaterialInsightDB.insight_id).where(MaterialInsightDB.material_number == material_number)
        insight_ids_result = await db.exec(insight_ids_query)
        insight_ids = [row for row in insight_ids_result.all()]

        if material_review_ids or checklist_ids or insight_ids:
            conditions = [
                # Material table changes
                (AuditLogDB.table_name == "sap_material_data") & (AuditLogDB.record_id == material_number),
            ]

            if material_review_ids:
                # Review table changes
                conditions.append((AuditLogDB.table_name == "material_reviews") & (AuditLogDB.record_id.in_(material_review_ids)))

            if checklist_ids:
                # Checklist table changes
                conditions.append((AuditLogDB.table_name == "review_checklist") & (AuditLogDB.record_id.in_(checklist_ids)))

            if insight_ids:
                # Insight table changes
                conditions.append((AuditLogDB.table_name == "material_insights") & (AuditLogDB.record_id.in_(insight_ids)))

            query = query.where(or_(*conditions))
        else:
            # Only material table changes
            query = query.where((AuditLogDB.table_name == "sap_material_data") & (AuditLogDB.record_id == material_number))

    # Get total count before pagination
    count_query = (
        select(func.count())
        .select_from(AuditLogDB)
        .where(AuditLogDB.table_name.in_(["sap_material_data", "material_reviews", "review_checklist", "material_insights"]))
    )
    if date_from:
        count_query = count_query.where(AuditLogDB.changed_at >= date_from)
    if date_to:
        count_query = count_query.where(AuditLogDB.changed_at <= date_to)
    if changed_by_user_id:
        count_query = count_query.where(AuditLogDB.changed_by == changed_by_user_id)
    if search:
        search_pattern = f"%{search}%"
        # For count, we need to join ProfileDB to search on user name
        count_query = count_query.outerjoin(ProfileDB, AuditLogDB.changed_by == ProfileDB.id).where(
            or_(
                (AuditLogDB.table_name == "sap_material_data") & (cast(AuditLogDB.record_id, String).ilike(search_pattern)),
                ProfileDB.full_name.ilike(search_pattern),
            )
        )
    # Apply same material_number filter logic to count
    if material_number is not None:
        if material_review_ids or checklist_ids or insight_ids:
            count_conditions = [
                # Material table changes
                (AuditLogDB.table_name == "sap_material_data") & (AuditLogDB.record_id == material_number),
            ]

            if material_review_ids:
                # Review table changes
                count_conditions.append((AuditLogDB.table_name == "material_reviews") & (AuditLogDB.record_id.in_(material_review_ids)))

            if checklist_ids:
                # Checklist table changes
                count_conditions.append((AuditLogDB.table_name == "review_checklist") & (AuditLogDB.record_id.in_(checklist_ids)))

            if insight_ids:
                # Insight table changes
                count_conditions.append((AuditLogDB.table_name == "material_insights") & (AuditLogDB.record_id.in_(insight_ids)))

            count_query = count_query.where(or_(*count_conditions))
        else:
            count_query = count_query.where((AuditLogDB.table_name == "sap_material_data") & (AuditLogDB.record_id == material_number))

    total_result = await db.exec(count_query)
    total = total_result.one()

    # Apply sorting
    sort_column_map = {
        "timestamp": AuditLogDB.changed_at,
        "material_number": AuditLogDB.record_id,  # For sap_material_data table
    }
    sort_column = sort_column_map.get(sort_by, AuditLogDB.changed_at)
    if sort_order == "asc":
        query = query.order_by(sort_column.asc().nulls_last())
    else:
        query = query.order_by(sort_column.desc().nulls_last())

    # Apply pagination
    query = query.offset(skip).limit(limit)

    # Execute query
    results = await db.exec(query)
    audit_logs_data = results.all()

    # Transform to human-readable format
    material_audit_logs = []
    for log, profile in audit_logs_data:
        print(f"Profile: {profile}")
        # Determine material_number based on table
        if log.table_name == "sap_material_data":
            mat_number = log.record_id
        elif log.table_name == "material_reviews":
            # Look up the material_number from the review
            review_query = select(MaterialReviewDB.material_number).where(MaterialReviewDB.review_id == log.record_id)
            review_result = await db.exec(review_query)
            mat_number_result = review_result.first()
            mat_number = mat_number_result if mat_number_result else None
        elif log.table_name == "review_checklist":
            # Two-hop lookup: checklist_id -> review_id -> material_number
            checklist_query = select(ReviewChecklistDB.review_id).where(ReviewChecklistDB.checklist_id == log.record_id)
            checklist_result = await db.exec(checklist_query)
            review_id_result = checklist_result.first()

            if review_id_result:
                review_query = select(MaterialReviewDB.material_number).where(MaterialReviewDB.review_id == review_id_result)
                review_result = await db.exec(review_query)
                mat_number = review_result.first()
            else:
                mat_number = None
        elif log.table_name == "material_insights":
            # Look up the material_number from the insight
            insight_query = select(MaterialInsightDB.material_number).where(MaterialInsightDB.insight_id == log.record_id)
            insight_result = await db.exec(insight_query)
            mat_number_result = insight_result.first()
            mat_number = mat_number_result if mat_number_result else None
        else:
            mat_number = None

        # Get material description
        material_desc = None
        if mat_number:
            material_query = select(SAPMaterialData.material_desc).where(SAPMaterialData.material_number == mat_number)
            material_result = await db.exec(material_query)
            material_desc = material_result.first()

        # Generate change summary
        change_summary = generate_change_summary(
            log.operation,
            log.table_name,
            log.fields_changed,
            log.old_values,
            log.new_values,
        )

        # Convert UUID to string for changed_by
        changed_by_str = str(log.changed_by) if log.changed_by else None

        material_audit_logs.append(
            MaterialAuditLogEntry(
                audit_id=log.audit_id,
                timestamp=log.changed_at,
                material_number=mat_number or 0,
                material_desc=material_desc,
                change_summary=change_summary,
                changed_by=changed_by_str,
                changed_by_user=UserProfile(id=profile.id, full_name=profile.full_name) if profile else None,
                table_name=log.table_name,
                operation=log.operation,
            )
        )

    return PaginatedMaterialAuditLogsResponse(
        items=material_audit_logs,
        total=total,
        skip=skip,
        limit=limit,
    )

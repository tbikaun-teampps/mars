"""Dashboard summary endpoints."""

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlmodel import case, func, select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.api.audit import generate_change_summary
from app.api.materials import get_metrics_for_snapshot
from app.core.auth import User, get_current_user
from app.core.database import get_db
from app.models.audit import MaterialAuditLogEntry
from app.models.db_models import (
    AuditLogDB,
    MaterialInsightDB,
    MaterialReviewDB,
    ProfileDB,
    ReviewChecklistDB,
    SAPMaterialData,
    UploadJobDB,
    UploadSnapshot,
)
from app.models.user import UserProfile

router = APIRouter()


class DashboardSummary(BaseModel):
    """Dashboard summary statistics."""

    total_inventory_value: float
    total_inventory_value_change: float
    opportunity_value: float
    opportunity_value_change: float
    total_overdue_reviews: int
    total_overdue_reviews_change: float
    acceptance_rate: float
    acceptance_rate_change: float

    # chart data
    outstanding_opportunities_chart_data: Optional[list[dict]] = None
    review_status_chart_data: Optional[list[dict]] = None

    last_upload_date: Optional[datetime] = None


async def get_last_upload_snapshot(db: AsyncSession) -> UploadSnapshot:
    """Fetch the last upload snapshot data."""

    query = select(UploadSnapshot).order_by(UploadSnapshot.created_at.desc()).limit(1)

    result = await db.exec(query)
    snapshot = result.first()

    return snapshot


async def get_last_upload_date(db: AsyncSession) -> Optional[datetime]:
    """Fetch the last successful upload date from upload_jobs."""

    query = select(UploadJobDB.completed_at).where(UploadJobDB.status == "completed").order_by(UploadJobDB.completed_at.desc()).limit(1)

    result = await db.exec(query)
    completed_at = result.first()

    return completed_at


async def get_opportunities_by_material_type(db: AsyncSession) -> list[dict]:
    """Get outstanding opportunities aggregated by material type."""

    query = (
        select(
            SAPMaterialData.material_type,
            func.coalesce(func.sum(MaterialInsightDB.opportunity_value), 0).label("value"),
        )
        .join(
            MaterialInsightDB,
            SAPMaterialData.material_number == MaterialInsightDB.material_number,
        )
        .where(
            MaterialInsightDB.opportunity_value.isnot(None),
            MaterialInsightDB.acknowledged_at.is_(None),
        )
        .group_by(SAPMaterialData.material_type)
        .order_by(func.sum(MaterialInsightDB.opportunity_value).desc())
    )

    result = await db.exec(query)
    rows = result.all()

    return [{"materialType": row.material_type or "Unknown", "value": float(row.value)} for row in rows]


async def get_rejection_rates_by_material_type(db: AsyncSession) -> list[dict]:
    """Get rejection rates aggregated by material type.

    Rejection = SME said 'keep_no_change' when planner proposed a change.
    This aligns with the acceptance rate logic in get_metrics_for_snapshot.
    """

    query = (
        select(
            SAPMaterialData.material_type,
            func.count(
                case(
                    (MaterialReviewDB.sme_recommendation == "keep_no_change", 1),
                )
            ).label("rejection_count"),
            func.count(MaterialReviewDB.review_id).label("total_count"),
        )
        .join(
            MaterialReviewDB,
            SAPMaterialData.material_number == MaterialReviewDB.material_number,
        )
        .where(
            MaterialReviewDB.proposed_action.isnot(None),
            MaterialReviewDB.proposed_action != "keep_no_change",
            MaterialReviewDB.sme_recommendation.isnot(None),
            MaterialReviewDB.status == "completed",
            MaterialReviewDB.is_superseded.is_(False),
        )
        .group_by(SAPMaterialData.material_type)
        .order_by(func.count(MaterialReviewDB.review_id).desc())
    )

    result = await db.exec(query)
    rows = result.all()

    chart_data = []
    for row in rows:
        total = row.total_count or 0
        count = row.rejection_count or 0
        percentage = round((count / total) * 100, 0) if total > 0 else 0

        chart_data.append(
            {
                "materialType": row.material_type or "Unknown",
                "count": count,
                "total": total,
                "percentage": percentage,
            }
        )

    return chart_data


@router.get("/dashboard")
async def get_dashboard_summary(
    _current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> DashboardSummary:
    """Get dashboard summary statistics."""

    # 1. Get last upload snapshot
    last_upload_snapshot = await get_last_upload_snapshot(db)

    # 2. Get current metrics
    current_metrics = await get_metrics_for_snapshot(db)

    # 3. Get last upload date
    last_upload_date = await get_last_upload_date(db)

    # 4. Get chart data
    opportunities_chart_data = await get_opportunities_by_material_type(db)
    rejections_chart_data = await get_rejection_rates_by_material_type(db)

    # 5. Perform comparison using last snapshot data
    # Round to 6 decimal places to avoid floating point precision issues (e.g., 1e-11)
    total_inventory_value_change = (
        round((current_metrics["total_inventory_value"] - last_upload_snapshot.total_inventory_value) / last_upload_snapshot.total_inventory_value, 6)
        if last_upload_snapshot and last_upload_snapshot.total_inventory_value > 0
        else 0.0
    )

    opportunity_value_change = (
        round(
            (current_metrics["total_opportunity_value"] - last_upload_snapshot.total_opportunity_value)
            / last_upload_snapshot.total_opportunity_value,
            6,
        )
        if last_upload_snapshot and last_upload_snapshot.total_opportunity_value > 0
        else 0.0
    )

    total_overdue_reviews_change = (
        round((current_metrics["total_overdue_reviews"] - last_upload_snapshot.total_overdue_reviews) / last_upload_snapshot.total_overdue_reviews, 6)
        if last_upload_snapshot and last_upload_snapshot.total_overdue_reviews > 0
        else 0.0
    )

    acceptance_rate_change = (
        round((current_metrics["acceptance_rate"] - last_upload_snapshot.acceptance_rate) / last_upload_snapshot.acceptance_rate, 6)
        if last_upload_snapshot and last_upload_snapshot.acceptance_rate > 0
        else 0.0
    )

    return DashboardSummary(
        total_inventory_value=current_metrics["total_inventory_value"],
        total_inventory_value_change=total_inventory_value_change,
        opportunity_value=current_metrics["total_opportunity_value"],
        opportunity_value_change=opportunity_value_change,
        total_overdue_reviews=current_metrics["total_overdue_reviews"],
        total_overdue_reviews_change=total_overdue_reviews_change,
        acceptance_rate=current_metrics["acceptance_rate"],
        acceptance_rate_change=acceptance_rate_change,
        outstanding_opportunities_chart_data=opportunities_chart_data,
        review_status_chart_data=rejections_chart_data,
        last_upload_date=last_upload_date,
    )


@router.get("/dashboard/recent-activity", response_model=list[MaterialAuditLogEntry])
async def get_recent_activity(
    _current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    limit: int = Query(10, ge=1, le=50, description="Number of recent activities to return"),
) -> list[MaterialAuditLogEntry]:
    """Get recent activity for the dashboard."""
    # Query recent audit logs for material-related tables
    query = (
        select(AuditLogDB, ProfileDB)
        .where(AuditLogDB.table_name.in_(["sap_material_data", "material_reviews", "review_checklist", "material_insights"]))
        .outerjoin(ProfileDB, AuditLogDB.changed_by == ProfileDB.id)
        .order_by(AuditLogDB.changed_at.desc())
        .limit(limit)
    )

    results = await db.exec(query)
    audit_logs_data = results.all()

    # Transform to human-readable format
    activity_logs = []
    for log, profile in audit_logs_data:
        # Determine material_number based on table
        if log.table_name == "sap_material_data":
            mat_number = log.record_id
        elif log.table_name == "material_reviews":
            review_query = select(MaterialReviewDB.material_number).where(MaterialReviewDB.review_id == log.record_id)
            review_result = await db.exec(review_query)
            mat_number = review_result.first()
        elif log.table_name == "review_checklist":
            checklist_query = select(ReviewChecklistDB.review_id).where(ReviewChecklistDB.checklist_id == log.record_id)
            checklist_result = await db.exec(checklist_query)
            review_id = checklist_result.first()

            if review_id:
                review_query = select(MaterialReviewDB.material_number).where(MaterialReviewDB.review_id == review_id)
                review_result = await db.exec(review_query)
                mat_number = review_result.first()
            else:
                mat_number = None
        elif log.table_name == "material_insights":
            insight_query = select(MaterialInsightDB.material_number).where(MaterialInsightDB.insight_id == log.record_id)
            insight_result = await db.exec(insight_query)
            mat_number = insight_result.first()
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

        changed_by_str = str(log.changed_by) if log.changed_by else None

        activity_logs.append(
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

    return activity_logs

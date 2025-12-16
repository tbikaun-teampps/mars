"""Insight endpoints."""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.auth import User, get_current_user
from app.core.database import get_db
from app.models.db_models import MaterialInsightDB

router = APIRouter()


@router.put("/materials/{material_number}/insights/{insight_id}/acknowledge")
async def acknowledge_insight(
    material_number: int,
    insight_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Acknowledge an insight (global acknowledgement)."""

    # Get the insight
    query = select(MaterialInsightDB).where(
        MaterialInsightDB.insight_id == insight_id,
        MaterialInsightDB.material_number == material_number,
    )
    result = await db.exec(query)
    insight = result.first()

    if not insight:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Insight {insight_id} not found for material {material_number}",
        )

    if insight.acknowledged_at is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Insight has already been acknowledged",
        )

    # Update the insight
    insight.acknowledged_at = datetime.now(timezone.utc)
    insight.acknowledged_by = current_user.id
    insight.last_modified_by = current_user.id

    db.add(insight)
    await db.commit()

    return {"message": "Insight acknowledged successfully"}


@router.put("/materials/{material_number}/insights/{insight_id}/unacknowledge")
async def unacknowledge_insight(
    material_number: int,
    insight_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Remove acknowledgement from an insight."""

    # Get the insight
    query = select(MaterialInsightDB).where(
        MaterialInsightDB.insight_id == insight_id,
        MaterialInsightDB.material_number == material_number,
    )
    result = await db.exec(query)
    insight = result.first()

    if not insight:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Insight {insight_id} not found for material {material_number}",
        )

    if insight.acknowledged_at is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Insight is not acknowledged",
        )

    # Remove acknowledgement
    # Set last_modified_by to track who performed the unacknowledge action
    insight.last_modified_by = current_user.id
    insight.acknowledged_at = None
    insight.acknowledged_by = None

    db.add(insight)
    await db.commit()

    return {"message": "Insight acknowledgement removed"}

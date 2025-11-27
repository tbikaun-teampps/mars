"""General materials endpoints."""

import io
import numpy as np
import pandas as pd
from datetime import date, timedelta
from typing import Optional
from fastapi import (
    APIRouter,
    Depends,
    File,
    HTTPException,
    Query,
    status,
    UploadFile,
)
from sqlalchemy import func as sa_func, text
from sqlalchemy.orm import aliased
from sqlmodel import select, func
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.config import settings
from app.core.auth import get_current_user, User
from app.models.review import MaterialReview, ReviewChecklist, ReviewStatus
from app.models.db_models import (
    SAPMaterialData,
    MaterialReviewDB,
    MaterialInsightDB,
    ReviewChecklistDB,
    ReviewCommentDB,
    ProfileDB,
)
from app.models.user import UserProfile
from app.core.database import get_db
from app.models.material import (
    Material,
    PaginatedMaterialsResponse,
    MaterialWithReviews,
    Insight,
)
from app.api.utils import transform_db_record_to_material

router = APIRouter()


@router.get("/materials")
async def list_materials(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    skip: int = Query(0, ge=0, description="Number of items to skip"),
    limit: int = Query(
        20, ge=1, le=100, description="Maximum number of items to return"
    ),
    sort_by: Optional[str] = Query(None, description="Field to sort by"),
    sort_order: Optional[str] = Query("asc", description="Sort order: asc or desc"),
    search: Optional[str] = Query(
        None,
        description="Search across material_number, material_desc, and material_type",
    ),
    # Filter parameters
    material_type: Optional[list[str]] = Query(
        None, description="Filter by material types (e.g., SPRS, HALB, FERT)"
    ),
    min_total_value: Optional[float] = Query(
        None, description="Minimum total value filter"
    ),
    max_total_value: Optional[float] = Query(
        None, description="Maximum total value filter"
    ),
    min_total_quantity: Optional[float] = Query(
        None, description="Minimum total quantity filter"
    ),
    max_total_quantity: Optional[float] = Query(
        None, description="Maximum total quantity filter"
    ),
    last_reviewed_filter: Optional[str] = Query(
        None,
        description="Filter by last reviewed: 'overdue_90' (>90 days), 'overdue_30' (>30 days), 'never' (never reviewed)",
    ),
    next_review_filter: Optional[str] = Query(
        None,
        description="Filter by next review: 'overdue' (past due), 'due_soon' (<30 days), 'not_scheduled' (no date set)",
    ),
    has_reviews: Optional[bool] = Query(
        None, description="Filter by whether material has any reviews"
    ),
    has_errors: Optional[bool] = Query(
        None, description="Filter by whether material has error insights"
    ),
    has_warnings: Optional[bool] = Query(
        None, description="Filter by whether material has warning insights"
    ),
) -> PaginatedMaterialsResponse:
    """List all materials with pagination, sorting, and search."""

    # Build base query with reviews count and most recent review data
    # Subquery to get the most recent review for each material
    latest_review = (
        select(
            MaterialReviewDB.material_number,
            MaterialReviewDB.review_date,
            MaterialReviewDB.next_review_date,
            # MaterialReviewDB.notes,
        )
        .where(MaterialReviewDB.status == ReviewStatus.COMPLETED.value)
        .distinct(MaterialReviewDB.material_number)
        .order_by(MaterialReviewDB.material_number, MaterialReviewDB.review_date.desc())
        .subquery()
    )

    # Use LEFT JOIN to count reviews and get latest review data
    # Create a JSON object for each insight and aggregate them
    insight_json = sa_func.json_build_object(
        "insight_type",
        MaterialInsightDB.insight_type,
        "message",
        MaterialInsightDB.message,
    )

    # Aggregate insights into a JSON array, filtering out NULL values
    # Use json_agg with filter to exclude rows where insight_type is NULL
    insights_agg = sa_func.coalesce(
        sa_func.json_agg(insight_json).filter(
            MaterialInsightDB.insight_type.isnot(None)
        ),
        text("'[]'::json"),
    ).label("insights")

    query = (
        select(
            SAPMaterialData,
            func.count(MaterialReviewDB.review_id.distinct()).label("reviews_count"),
            latest_review.c.review_date.label("last_reviewed"),
            latest_review.c.next_review_date.label("next_review"),
            # latest_review.c.notes.label("review_notes"),
            insights_agg,
        )
        .outerjoin(
            MaterialReviewDB,
            SAPMaterialData.material_number == MaterialReviewDB.material_number,
        )
        .outerjoin(
            latest_review,
            SAPMaterialData.material_number == latest_review.c.material_number,
        )
        .outerjoin(
            MaterialInsightDB,
            SAPMaterialData.material_number == MaterialInsightDB.material_number,
        )
        .group_by(
            SAPMaterialData.material_number,
            latest_review.c.review_date,
            latest_review.c.next_review_date,
            # latest_review.c.notes,
        )
    )

    # Apply search filter if provided
    if search:
        search_pattern = f"%{search}%"
        query = query.where(
            (SAPMaterialData.material_number.cast(str).ilike(search_pattern))
            | (SAPMaterialData.material_desc.ilike(search_pattern))
            | (SAPMaterialData.material_type.ilike(search_pattern))
        )

    # Apply material type filter
    if material_type:
        query = query.where(SAPMaterialData.material_type.in_(material_type))

    # Apply total value range filters
    if min_total_value is not None:
        query = query.where(SAPMaterialData.total_value >= min_total_value)
    if max_total_value is not None:
        query = query.where(SAPMaterialData.total_value <= max_total_value)

    # Apply total quantity range filters
    if min_total_quantity is not None:
        query = query.where(SAPMaterialData.total_quantity >= min_total_quantity)
    if max_total_quantity is not None:
        query = query.where(SAPMaterialData.total_quantity <= max_total_quantity)

    # Apply has_reviews filter (uses HAVING since it's aggregated)
    if has_reviews is not None:
        if has_reviews:
            query = query.having(
                func.count(MaterialReviewDB.review_id.distinct()) > 0
            )
        else:
            query = query.having(
                func.count(MaterialReviewDB.review_id.distinct()) == 0
            )

    # Apply last_reviewed_filter (uses HAVING since it depends on latest_review)
    today = date.today()
    if last_reviewed_filter:
        if last_reviewed_filter == "never":
            query = query.having(latest_review.c.review_date.is_(None))
        elif last_reviewed_filter == "overdue_30":
            threshold_30 = today - timedelta(days=30)
            query = query.having(latest_review.c.review_date < threshold_30)
        elif last_reviewed_filter == "overdue_90":
            threshold_90 = today - timedelta(days=90)
            query = query.having(latest_review.c.review_date < threshold_90)

    # Apply next_review_filter (uses HAVING since it depends on latest_review)
    if next_review_filter:
        if next_review_filter == "not_scheduled":
            # Has been reviewed but no next review date set
            query = query.having(
                (latest_review.c.review_date.isnot(None))
                & (latest_review.c.next_review_date.is_(None))
            )
        elif next_review_filter == "overdue":
            # Next review date is in the past
            query = query.having(latest_review.c.next_review_date < today)
        elif next_review_filter == "due_soon":
            # Next review date is within 30 days
            threshold_30 = today + timedelta(days=30)
            query = query.having(
                (latest_review.c.next_review_date >= today)
                & (latest_review.c.next_review_date <= threshold_30)
            )

    # Apply insights filters (has_errors, has_warnings)
    # These need to filter based on aggregated insight data
    if has_errors is not None and has_errors:
        # Filter for materials that have at least one error insight
        query = query.having(
            sa_func.count(
                sa_func.nullif(MaterialInsightDB.insight_type != "error", True)
            )
            > 0
        )

    if has_warnings is not None and has_warnings:
        # Filter for materials that have at least one warning insight
        query = query.having(
            sa_func.count(
                sa_func.nullif(MaterialInsightDB.insight_type != "warning", True)
            )
            > 0
        )

    # Apply sorting if provided
    if sort_by:
        # Map frontend field names to model attributes
        field_mapping = {
            "material_number": SAPMaterialData.material_number,
            "material_desc": SAPMaterialData.material_desc,
            "material_description": SAPMaterialData.material_desc,
            "created_on": SAPMaterialData.created_on,
            "total_quantity": SAPMaterialData.total_quantity,
            "total_qty": SAPMaterialData.total_quantity,
            "total_value": SAPMaterialData.total_value,
            "unit_value": SAPMaterialData.total_value,
            "safety_stock": SAPMaterialData.safety_stock,
            "coverage_ratio": SAPMaterialData.coverage_ratio,
            "last_reviewed": latest_review.c.review_date,
            "next_review": latest_review.c.next_review_date,
        }

        sort_column = field_mapping.get(sort_by)
        if sort_column is not None:
            if sort_order == "desc":
                query = query.order_by(sort_column.desc())
            else:
                query = query.order_by(sort_column.asc())
        else:
            print(f"Warning: Unknown sort field '{sort_by}', ignoring sort")

    # Get total count before pagination
    # For complex queries with HAVING clauses, count distinct material_numbers from the filtered query
    # Create a subquery without pagination to count total matching rows
    count_subquery = query.with_only_columns(SAPMaterialData.material_number).subquery()
    count_query = select(func.count()).select_from(count_subquery)

    total_result = await db.exec(count_query)
    total = total_result.one()

    # Apply pagination
    query = query.offset(skip).limit(limit)

    # Execute query
    results = await db.exec(query)
    rows = results.all()

    # Transform database records to Material models with reviews_count, review data, and insights
    materials = []
    for (
        material_data,
        reviews_count,
        last_reviewed,
        next_review,
        # review_notes,
        insights_json,
    ) in rows:
        material_dict = transform_db_record_to_material(
            material_data.model_dump()
        ).model_dump()
        material_dict["reviews_count"] = reviews_count
        # Override with data from material_reviews table (most recent review)
        material_dict["last_reviewed"] = last_reviewed
        material_dict["next_review"] = next_review
        # material_dict["review_notes"] = review_notes
        # Transform insights from JSON to Insight objects
        if insights_json and isinstance(insights_json, list):
            material_dict["insights"] = [
                Insight(**insight) for insight in insights_json
            ]
        else:
            material_dict["insights"] = []
        materials.append(Material(**material_dict))

    print(
        f"Total materials: {total}, Returning items {skip} to {skip + limit}, "
        f"Sorted by: {sort_by} {sort_order}, Search: {search}"
    )

    return PaginatedMaterialsResponse(
        items=materials,
        total=total,
        skip=skip,
        limit=limit,
    )


@router.get("/materials/{material_number}")
async def get_material(
    material_number: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> MaterialWithReviews | None:
    """Get material details by material number."""

    # Get material
    material_query = select(SAPMaterialData).where(
        SAPMaterialData.material_number == material_number
    )
    material_result = await db.exec(material_query)
    material_data = material_result.first()

    if not material_data:
        return None

    # Create aliases for profile joins (one for initiator, one for decider)
    InitiatorProfile = aliased(ProfileDB)
    DeciderProfile = aliased(ProfileDB)

    # Get reviews for this material with comment counts, ordered by review_date descending
    reviews_query = (
        select(
            MaterialReviewDB,
            ReviewChecklistDB,
            InitiatorProfile,
            DeciderProfile,
            func.count(ReviewCommentDB.comment_id).label("comments_count")
        )
        .where(MaterialReviewDB.material_number == material_number)
        .outerjoin(
            ReviewChecklistDB, MaterialReviewDB.review_id == ReviewChecklistDB.review_id
        )
        .outerjoin(
            InitiatorProfile, MaterialReviewDB.initiated_by == InitiatorProfile.id
        )
        .outerjoin(DeciderProfile, MaterialReviewDB.decided_by == DeciderProfile.id)
        .outerjoin(
            ReviewCommentDB, MaterialReviewDB.review_id == ReviewCommentDB.review_id
        )
        .group_by(
            MaterialReviewDB.review_id,
            ReviewChecklistDB.checklist_id,
            InitiatorProfile.id,
            DeciderProfile.id
        )
        .order_by(MaterialReviewDB.review_date.desc())
    )
    reviews_result = await db.exec(reviews_query)
    reviews_data = reviews_result.all()

    # Transform to response models
    material = transform_db_record_to_material(material_data.model_dump())
    reviews = []
    for r, checklist_db, initiator_profile, decider_profile, comments_count in reviews_data:
        # Create checklist object if checklist data exists
        checklist = None
        if checklist_db:
            checklist = ReviewChecklist(
                has_open_orders=checklist_db.has_open_orders,
                has_forecast_demand=checklist_db.has_forecast_demand,
                checked_alternate_plants=checklist_db.checked_alternate_plants,
                contacted_procurement=checklist_db.contacted_procurement,
                reviewed_bom_usage=checklist_db.reviewed_bom_usage,
                checked_supersession=checklist_db.checked_supersession,
                checked_historical_usage=checklist_db.checked_historical_usage,
                open_order_numbers=checklist_db.open_order_numbers,
                forecast_next_12m=checklist_db.forecast_next_12m,
                alternate_plant_qty=checklist_db.alternate_plant_qty,
                procurement_feedback=checklist_db.procurement_feedback,
            )

        # Create user profile objects if profile data exists
        initiated_by_user = None
        if initiator_profile:
            initiated_by_user = UserProfile(
                id=initiator_profile.id, full_name=initiator_profile.full_name
            )

        decided_by_user = None
        if decider_profile:
            decided_by_user = UserProfile(
                id=decider_profile.id, full_name=decider_profile.full_name
            )

        review = MaterialReview(
            review_id=r.review_id,
            material_number=r.material_number,
            initiated_by=r.initiated_by,
            initiated_by_user=initiated_by_user,
            review_date=r.review_date,
            review_reason=r.review_reason,
            current_stock_qty=r.current_stock_qty,
            current_stock_value=r.current_stock_value,
            months_no_movement=r.months_no_movement,
            proposed_action=r.proposed_action,
            proposed_qty_adjustment=r.proposed_qty_adjustment,
            business_justification=r.business_justification,
            sme_name=r.sme_name,
            sme_email=r.sme_email,
            sme_department=r.sme_department,
            sme_feedback_method=r.sme_feedback_method,
            sme_contacted_date=r.sme_contacted_date,
            sme_responded_date=r.sme_responded_date,
            sme_recommendation=r.sme_recommendation,
            sme_recommended_qty=r.sme_recommended_qty,
            sme_analysis=r.sme_analysis,
            alternative_applications=r.alternative_applications,
            risk_assessment=r.risk_assessment,
            final_decision=r.final_decision,
            final_qty_adjustment=r.final_qty_adjustment,
            # final_notes=r.final_notes,
            decided_by=r.decided_by,
            decided_by_user=decided_by_user,
            decided_at=r.decided_at,
            requires_follow_up=r.requires_follow_up,
            next_review_date=r.next_review_date,
            follow_up_reason=r.follow_up_reason,
            review_frequency_weeks=r.review_frequency_weeks,
            previous_review_id=r.previous_review_id,
            estimated_savings=r.estimated_savings,
            implementation_date=r.implementation_date,
            status=r.status,
            completed_checklist=r.completed_checklist,
            checklist=checklist,
            created_at=r.created_at,
            updated_at=r.updated_at,
            is_read_only=r.status
            in [ReviewStatus.COMPLETED.value, ReviewStatus.CANCELLED.value],
            comments_count=comments_count or 0
        )
        reviews.append(review)

    # Get the most recent COMPLETED review data for last_reviewed/next_review
    material_dict = material.model_dump()
    if reviews_data:
        # Find the first completed review (reviews are ordered by date desc)
        most_recent_completed_review = None
        for r, _, _, _, _ in reviews_data:
            if r.status == ReviewStatus.COMPLETED.value:
                most_recent_completed_review = r
                break

        if most_recent_completed_review:
            material_dict["last_reviewed"] = most_recent_completed_review.review_date
            material_dict["next_review"] = most_recent_completed_review.next_review_date
            # material_dict["review_notes"] = most_recent_completed_review.notes
        else:
            # No completed reviews, set to None
            material_dict["last_reviewed"] = None
            material_dict["next_review"] = None
            material_dict["review_notes"] = None
    else:
        # No reviews exist, set to None
        material_dict["last_reviewed"] = None
        material_dict["next_review"] = None
        material_dict["review_notes"] = None

    # Fetch insights for this material
    insights_query = select(MaterialInsightDB).where(
        MaterialInsightDB.material_number == material_number
    )
    insights_result = await db.exec(insights_query)
    insights_data = insights_result.all()

    # Transform to Insight objects
    insights = [
        Insight(insight_type=i.insight_type, message=i.message)
        for i in insights_data
    ]
    material_dict["insights"] = insights

    return MaterialWithReviews(**material_dict, reviews=reviews)


def generate_material_insight(material: SAPMaterialData) -> list[Insight]:
    """Generate insights for a material based on its data."""
    insights: list[Insight] = []
    saving_potential = 0.0
    unrestricted_qty = material.unrestricted_quantity
    safety_stock = material.safety_stock
    coverage_ratio = material.coverage_ratio
    total_qty = material.total_quantity
    total_value = material.total_value

    print(f"Processing insights for material\n{material}")

    # Calculate unit cost if we have both quantity and value
    unit_cost = 0.0
    if total_qty > 0 and total_value is not None and total_value > 0:
        unit_cost = total_value / total_qty

    # Case 1: No unrestricted stock and no safety stock - likely on-demand/catalogue item
    if unrestricted_qty == 0 and safety_stock == 0:
        insights.append(
            Insight(
                insight_type="info",
                message="Material has zero unrestricted quantity and zero safety stock. Likely a catalogue/on-demand item.",
            )
        )

    # Case 2: Has unrestricted stock but no safety stock - warning needed
    elif unrestricted_qty > 0 and safety_stock == 0:
        insights.append(
            Insight(
                insight_type="warning",
                message="Material has unrestricted stock but no safety stock level defined. Consider setting a safety stock level to prevent stockouts.",
            )
        )

    # Case 3: Unrestricted stock is less than safety stock - critical issue
    elif unrestricted_qty < safety_stock:
        shortage_qty = safety_stock - unrestricted_qty
        insights.append(
            Insight(
                insight_type="error",
                message=f"Critical: Unrestricted stock ({unrestricted_qty}) is below safety stock level ({safety_stock}). Shortage: {shortage_qty}",
            )
        )

    # Case 4: Both unrestricted and safety stock exist - optimize based on coverage ratio
    elif unrestricted_qty > 0 and safety_stock > 0:
        if coverage_ratio is not None and coverage_ratio > 0:
            # Calculate ideal stock based on coverage ratio threshold
            ideal_stock = unrestricted_qty * (
                settings.coverage_ratio_threshold / coverage_ratio
            )

            # Ensure ideal stock doesn't go below safety stock
            optimized_stock = max(ideal_stock, safety_stock)

            if optimized_stock < unrestricted_qty:
                # Overstocked - potential for reduction
                reduction_qty = unrestricted_qty - optimized_stock

                # Calculate potential savings using unit cost
                if unit_cost > 0:
                    saving_potential = reduction_qty * unit_cost

                insights.append(
                    Insight(
                        insight_type="warning",
                        message=f"Material is overstocked. Current: {unrestricted_qty}, Optimal: {optimized_stock:.0f}, Potential reduction: {reduction_qty:.0f}",
                    )
                )

                # Add savings insight if we have a valid calculation
                if saving_potential > 0:
                    insights.append(
                        Insight(
                            insight_type="info",
                            message=f"Potential savings (optimistic): ${saving_potential:,.2f} (Unit cost: ${unit_cost:.2f})",
                        )
                    )

            elif unrestricted_qty < ideal_stock:
                # Understocked based on coverage ratio (but above safety stock)
                gap_qty = ideal_stock - unrestricted_qty
                insights.append(
                    Insight(
                        insight_type="info",
                        message=f"Material is understocked based on coverage ratio. Current: {unrestricted_qty}, Ideal: {ideal_stock:.0f}, Gap: {gap_qty:.0f}",
                    )
                )
            else:
                # Stock is at optimal level
                insights.append(
                    Insight(
                        insight_type="success",
                        message="Material stock level is optimal based on coverage ratio and safety stock.",
                    )
                )
        else:
            # No coverage ratio available
            insights.append(
                Insight(
                    insight_type="info",
                    message="Coverage ratio not available for optimization analysis.",
                )
            )

    return insights


# Add endpoint for uploading csv of SAP material data
@router.post("/materials/upload-sap-data", status_code=status.HTTP_200_OK)
async def upload_sap_material_data(
    current_user: User = Depends(get_current_user),
    csv_file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Upload SAP material data CSV to update materials data."""

    # Validate file extension
    if not csv_file.filename or not csv_file.filename.endswith(".csv"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File must be a CSV file (.csv extension required)",
        )

    # CSV column mapping to database fields
    # Note: Fixed column names to match database schema
    column_mapping = {
        "Material Number": "material_number",
        "Material Description": "material_desc",
        "Material Type": "material_type",
        "Mat Group": "mat_group",
        "MGrp Text": "mat_group_desc",
        "MRP Controller": "mrp_controller",
        "Created On": "created_on",
        "Total Qty": "total_quantity",
        "Total Value": "total_value",
        "Unrestricted Qty": "unrestricted_quantity",
        "Safety Stock": "safety_stock",
        "Unrestricted Value": "unrestricted_value",
        "Stock / Av Consump 3 Years": "coverage_ratio",
        "Max of Cons Av. & 12m Demand": "max_cons_demand",
        "Demand & FC 12m": "demand_fc_12m",
        "Demand & FC Total": "demand_fc_total",
        "Year 1 Cons": "cons_1y",
        "Year 2 Cons": "cons_2y",
        "Year 3 Cons": "cons_3y",
        "Year 4 Cons": "cons_4y",
        "Year 5 Cons": "cons_5y",
        "Purchased Qty Last 2Y": "purchased_qty_2y",
        "OBS LAST REVIEWED": "last_reviewed",
        "OBS NEXT REVIEW": "next_review",
        "OBS Notes": "review_notes",
    }

    try:
        # Read file content from uploaded file
        content = await csv_file.read()

        # Read CSV using pandas
        df = pd.read_csv(
            io.BytesIO(content),
            encoding="utf-8",
            thousands=",",  # Handle comma thousands separators (e.g., "1,234" -> 1234)
            na_values=["", "NA", "N/A", "null", "NULL"],
        )

        # Take first n rows for testing
        df = df.head(10)

        # Validate that required columns exist
        missing_columns = set(column_mapping.keys()) - set(df.columns)
        if missing_columns:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Missing required columns: {', '.join(sorted(missing_columns))}",
            )

        # Check if dataframe is empty
        if df.empty:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="CSV file contains no data rows",
            )

        # Select only the columns we need and rename them
        df = df[list(column_mapping.keys())].rename(columns=column_mapping)

        # Convert string columns to string type to handle numeric values in CSV
        # This ensures columns like mat_group (which might be "1305") are strings, not integers
        string_columns = [
            "material_desc",
            "material_type",
            "mat_group",
            "mat_group_desc",
            "mrp_controller",
            "review_notes",
        ]

        for col in string_columns:
            # Convert to string, handling None/NaN values
            df[col] = df[col].astype(str)
            # Replace 'nan' string (from converting None to string) back to None
            df[col] = df[col].replace(["nan", "None"], None)

        # Validate material_number is not null
        if df["material_number"].isna().any():
            first_null_idx = df["material_number"].isna().idxmax()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Row {first_null_idx + 2}: Material Number is required",  # +2 for header and 0-index
            )

        # Clean numeric columns - strip currency symbols, spaces, and convert to numeric
        numeric_columns = [
            "total_quantity",
            "total_value",
            "unrestricted_quantity",
            "unrestricted_value",
            "safety_stock",
            "coverage_ratio",
            "max_cons_demand",
            "demand_fc_12m",
            "demand_fc_total",
            "cons_1y",
            "cons_2y",
            "cons_3y",
            "cons_4y",
            "cons_5y",
            "purchased_qty_2y",
        ]

        for col in numeric_columns:
            # Clean currency symbols and spaces, then convert to numeric
            # Handles values like "$12,081,199 ", "$ 1,234.56", etc.
            df[col] = df[col].astype(str).str.replace("$", "", regex=False).str.strip()
            df[col] = pd.to_numeric(df[col], errors="coerce")
            # Replace infinity values with NaN (which will become None in JSON)
            df[col] = df[col].replace([float("inf"), float("-inf")], pd.NA)

        # Convert date columns to Python date objects
        # Note: CSV dates are in DD/MM/YYYY or DD/MM/YY format
        for date_col in ["created_on", "last_reviewed", "next_review"]:
            df[date_col] = pd.to_datetime(
                df[date_col], format="mixed", dayfirst=True, errors="coerce"
            ).dt.date

        # Replace all non-JSON-compliant values with None
        # This ensures no NaN, inf, -inf, pd.NA, or pd.NaT values remain
        df = df.replace([np.nan, np.inf, -np.inf, pd.NA, pd.NaT], None)

        # Validate created_on is not null (required field)
        if df["created_on"].isna().any() or (df["created_on"] == None).any():
            # Find rows with null created_on
            null_mask = df["created_on"].isna() | (df["created_on"] == None)
            null_indices = df[null_mask].index.tolist()
            first_null_idx = null_indices[0]
            null_count = len(null_indices)

            # Get the original value from the CSV before date conversion
            # We need to re-read the original value to show what was invalid
            original_df = pd.read_csv(
                io.BytesIO(content),
                encoding="utf-8",
                thousands=",",
                na_values=["", "NA", "N/A", "null", "NULL"],
            )
            original_df = original_df.head(10)
            original_created_on = original_df.iloc[first_null_idx]["Created On"]

            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Row {first_null_idx + 2}: Created On date is required but is missing or invalid. "
                f"Received: '{original_created_on}' ({null_count} row(s) affected). "
                f"Expected format: YYYY-MM-DD HH:MM:SS or YYYY-MM-DD",
            )

        # Convert dataframe to list of dictionaries for database insertion
        records_to_insert = df.to_dict("records")

        # Insert records into database one at a time to handle duplicates gracefully
        inserted_count = 0
        skipped_count = 0
        skipped_materials = []

        for record in records_to_insert:
            try:
                # Create SQLModel instance from record dict
                material = SAPMaterialData(**record)
                db.add(material)
                await db.commit()
                inserted_count += 1
            except Exception as db_error:
                await db.rollback()
                # Check if it's a duplicate key error
                error_msg = str(db_error).lower()
                if (
                    "duplicate" in error_msg
                    or "unique" in error_msg
                    or "constraint" in error_msg
                ):
                    # Skip this duplicate record and continue
                    skipped_count += 1
                    # Only add to list if we haven't reached 50 (to keep response size reasonable)
                    if len(skipped_materials) < 50:
                        skipped_materials.append(
                            record.get("material_number", "unknown")
                        )
                else:
                    # Re-raise other database errors (not duplicates)
                    raise HTTPException(
                        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                        detail=f"Database error on material {record.get('material_number', 'unknown')}: {str(db_error)}",
                    )

                continue  # Continue to next record after handling duplicate

            # Generate insights for the record
            try:
                insights = generate_material_insight(material)
                for insight in insights:
                    insight_model = MaterialInsightDB(
                        **insight.model_dump(),
                        material_number=material.material_number,
                    )
                    db.add(insight_model)
                    await db.commit()
            except Exception as insight_error:
                print(
                    f"Failed to generate insights for material {material.material_number}: {str(insight_error)}"
                )

        # Extract OBS review data and create initial material review(s)
        inserted_reviews = 0
        for record in records_to_insert:
            if record.get("last_reviewed"):
                review_db = MaterialReviewDB(
                    material_number=record.get("material_number"),

                    created_by="00000000-0000-0000-0000-000000000000",  # System user
                    last_updated_by="00000000-0000-0000-0000-000000000000",  # System user
                    created_at=record.get("last_reviewed"),
                    updated_at=record.get("last_reviewed"),

                    initiated_by="00000000-0000-0000-0000-000000000000",  # System user
                    review_date=record.get("last_reviewed"),

                    review_reason="Initial OBS data import",
                    current_stock_qty=record.get("unrestricted_quantity"),
                    current_stock_value=round(record.get("total_value")/record.get('total_quantity') * record.get('unrestricted_quantity'), 2) if record.get('total_quantity') and record.get('total_value') else 0,
                    months_no_movement=0,
                    proposed_action="No action proposed (historical data)",
                    proposed_qty_adjustment=0,
                    business_justification="N/A",
                    sme_name="System",
                    sme_email="system@mars.teampps.com",
                    sme_department="System",
                    sme_feedback_method="other",
                    sme_contacted_date=record.get("last_reviewed"),
                    sme_responded_date=record.get("last_reviewed"),
                    sme_recommendation="N/A",
                    sme_recommended_qty=0,
                    sme_analysis="N/A",
                    alternative_applications="N/A",
                    risk_assessment="N/A",

                    final_decision="no change",
                    final_qty_adjustment=0,
                    final_notes=record.get("review_notes"),
                    decided_by="00000000-0000-0000-0000-000000000000",  # System user
                    decided_at=record.get("last_reviewed"),

                    requires_follow_up=True if record.get("next_review") else False,
                    next_review_date=record.get("next_review"),
                    follow_up_reason="Scheduled review from initial OBS data import" if record.get("next_review") else None,
                    review_frequency_weeks=0,
                    status="completed",
                    completed_checklist=True,
                )
                print(
                    f"Inserting initial review for material {record['material_number']}"
                )
                try:
                    db.add(review_db)
                    await db.commit()
                    inserted_reviews += 1
                    # Automatically complete the checklist for the imported review
                    checklist_db = ReviewChecklistDB(
                        review_id=review_db.review_id,
                        created_by="00000000-0000-0000-0000-000000000000",  # System user
                        last_updated_by="00000000-0000-0000-0000-000000000000",  # System user
                        created_at=record.get("last_reviewed"),
                        updated_at=record.get("last_reviewed"),
                        
                        has_open_orders=False,
                        has_forecast_demand=False,
                        checked_alternate_plants=False,
                        contacted_procurement=False,
                        reviewed_bom_usage=False,
                        checked_supersession=False,
                        checked_historical_usage=False,
                    )
                    db.add(checklist_db)
                    await db.commit()
                except Exception as e:
                    await db.rollback()
                    print(f"Failed to insert review: {str(e)}")
        print(f"Inserted {inserted_reviews} initial material reviews from OBS data")

        # Prepare response message
        if inserted_count == 0 and skipped_count > 0:
            message = "All materials already exist in database (all duplicates skipped)"
        elif skipped_count > 0:
            message = f"SAP material data uploaded. {inserted_count} new materials added, {skipped_count} duplicates skipped"
        else:
            message = "SAP material data uploaded successfully"

        return {
            "message": message,
            "records_inserted": inserted_count,
            "records_skipped": skipped_count,
            "skipped_materials": skipped_materials if skipped_count > 0 else [],
            "reviews_inserted": inserted_reviews,
        }

    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except UnicodeDecodeError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid CSV file encoding. Please ensure the file is UTF-8 encoded.",
        )
    except pd.errors.EmptyDataError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="CSV file is empty",
        )
    except pd.errors.ParserError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"CSV file parsing error: {str(e)}",
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process SAP material data: {str(e)}",
        )

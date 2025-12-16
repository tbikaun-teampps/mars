from datetime import date, datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel

from app.models.review import MaterialReview
from app.models.user import UserProfile


class Insight(BaseModel):
    """Insight model."""

    insight_id: Optional[int] = None
    insight_type: str  # 'info', 'warning', 'error', 'success'
    message: str
    acknowledged_at: Optional[datetime] = None
    acknowledged_by: Optional[UUID] = None
    acknowledged_by_user: Optional[UserProfile] = None
    opportunity_value: Optional[float] = None


class ConsumptionHistory(BaseModel):
    """Consumption history model."""

    years_ago: int
    quantity: float | None = 0


class SimilarMaterial(BaseModel):
    """Similar material model."""

    material_number: int
    similarity_score: float
    material_description: str
    total_qty: Optional[float] = 0
    total_value: Optional[float] = 0
    unrestricted_qty: Optional[float] = 0
    safety_stock: Optional[float] = 0


class Material(BaseModel):
    """Material model."""

    material_number: int
    material_desc: str
    material_type: str
    created_on: date
    mat_group: Optional[str] = None
    mat_group_desc: Optional[str] = None
    mrp_controller: Optional[str] = None
    plant: Optional[str] = None
    total_quantity: Optional[float] = 0
    total_value: Optional[float] = 0
    unit_value: Optional[float] = 0  # Computed: total_value / total_quantity
    unrestricted_quantity: Optional[float] = 0
    unrestricted_value: Optional[float] = 0
    safety_stock: Optional[float] = 0
    stock_safety_ratio: Optional[float] = None  # total_quantity / safety_stock
    coverage_ratio: Optional[float | str] = None
    max_cons_demand: Optional[float] = None
    demand_fc_12m: Optional[float] = None
    demand_fc_total: Optional[float] = None
    cons_1y: Optional[float] = None
    cons_2y: Optional[float] = None
    cons_3y: Optional[float] = None
    cons_4y: Optional[float] = None
    cons_5y: Optional[float] = None
    purchased_qty_2y: Optional[float] = None
    consumption_history_5yr: list[ConsumptionHistory] | None = None  # Computed from cons_1y-5y
    last_reviewed: date | None = None
    next_review: date | None = None
    # review_notes: str | None = None
    reviews_count: int | None = 0  # Number of reviews
    insights: list[Insight] = []  # List of insights
    opportunity_value_sum: Optional[float] = None  # Sum of opportunity_value from insights
    # True if there's an active (non-completed/cancelled) review
    has_active_review: bool = False


class MaterialWithReviews(Material):
    """Material model with reviews."""

    reviews: list[MaterialReview]  # List of material reviews


class PaginatedMaterialsResponse(BaseModel):
    """Paginated materials response."""

    items: list[Material]
    total: int
    skip: int
    limit: int

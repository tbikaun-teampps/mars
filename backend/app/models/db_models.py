"""SQLModel database models."""

from datetime import date, datetime
from typing import Optional, Any
from uuid import UUID, uuid4

from sqlmodel import Field, Relationship, SQLModel, Column, JSON
from sqlalchemy import ARRAY, String, text, TIMESTAMP


class ProfileDB(SQLModel, table=True):
    """User Profile table model."""

    __tablename__ = "profiles"

    id: UUID = Field(primary_key=True)
    full_name: Optional[str] = None
    created_at: datetime = Field(
        sa_column=Column(TIMESTAMP(timezone=True),
                         server_default=text("NOW()"))
    )
    updated_at: datetime = Field(
        sa_column=Column(TIMESTAMP(timezone=True),
                         server_default=text("NOW()"))
    )
    is_admin: bool = Field(default=False)


class SAPMaterialData(SQLModel, table=True):
    """SAP Material Data table model."""

    __tablename__ = "sap_material_data"

    material_number: int = Field(primary_key=True)
    material_desc: Optional[str] = None
    material_type: Optional[str] = Field(default=None, max_length=20)
    mat_group: Optional[str] = Field(default=None, max_length=20)
    mat_group_desc: Optional[str] = None
    mrp_controller: Optional[str] = Field(default=None, max_length=50)
    plant: Optional[str] = Field(default=None, max_length=50)
    created_on: Optional[date] = None
    total_quantity: Optional[float] = None
    total_value: Optional[float] = None
    unrestricted_quantity: Optional[float] = None
    unrestricted_value: Optional[float] = None
    safety_stock: Optional[float] = None
    coverage_ratio: Optional[float] = None
    max_cons_demand: Optional[float] = None
    demand_fc_12m: Optional[float] = None
    demand_fc_total: Optional[float] = None
    cons_1y: Optional[float] = None
    cons_2y: Optional[float] = None
    cons_3y: Optional[float] = None
    cons_4y: Optional[float] = None
    cons_5y: Optional[float] = None
    purchased_qty_2y: Optional[float] = None
    last_reviewed: Optional[date] = None
    next_review: Optional[date] = None
    review_notes: Optional[str] = None
    uploaded_at: datetime = Field(
        sa_column=Column(TIMESTAMP(timezone=True),
                         server_default=text("NOW()"))
    )
    last_upload_job_id: Optional[UUID] = Field(
        default=None, foreign_key="upload_jobs.job_id")
    first_uploaded_at: Optional[datetime] = Field(
        default=None, sa_column=Column(TIMESTAMP(timezone=True))
    )
    last_modified_at: Optional[datetime] = Field(
        default=None, sa_column=Column(TIMESTAMP(timezone=True))
    )

    # Relationships
    reviews: list["MaterialReviewDB"] = Relationship(back_populates="material")
    insights: list["MaterialInsightDB"] = Relationship(
        back_populates="material")


class MaterialInsightDB(SQLModel, table=True):
    """Material Insight table model."""

    __tablename__ = "material_insights"

    insight_id: Optional[int] = Field(default=None, primary_key=True)
    material_number: int = Field(
        foreign_key="sap_material_data.material_number")
    insight_type: str = Field(max_length=50)
    message: str
    created_at: datetime = Field(
        sa_column=Column(TIMESTAMP(timezone=True),
                         server_default=text("NOW()"))
    )

    # Acknowledgement fields
    acknowledged_at: Optional[datetime] = Field(
        default=None, sa_column=Column(TIMESTAMP(timezone=True))
    )
    acknowledged_by: Optional[UUID] = Field(
        default=None, foreign_key="profiles.id")
    last_modified_by: Optional[UUID] = Field(
        default=None, foreign_key="profiles.id")

    # Relationship to material
    material: Optional[SAPMaterialData] = Relationship(
        back_populates="insights")


class MaterialReviewDB(SQLModel, table=True):
    """Material Review table model."""

    __tablename__ = "material_reviews"

    review_id: Optional[int] = Field(default=None, primary_key=True)
    material_number: int = Field(
        foreign_key="sap_material_data.material_number")

    # Initiator (MRP Planner) info
    initiated_by: UUID = Field(
        sa_column_kwargs={
            "server_default": text(
                "auth.uid()"
            )
        }
    )
    review_date: date = Field(
        sa_column_kwargs={"server_default": text("CURRENT_DATE")})

    created_by: UUID = Field(
        sa_column_kwargs={
            "server_default": text(
                "auth.uid()"
            )
        }
    )
    last_updated_by: UUID = Field(
        sa_column_kwargs={
            "server_default": text(
                "auth.uid()"
            )
        }
    )

    # Structured form fields (Planner fills these out)
    review_reason: Optional[str] = Field(default=None, max_length=100)
    current_stock_qty: Optional[float] = None
    current_stock_value: Optional[float] = None
    months_no_movement: Optional[int] = None
    proposed_action: Optional[str] = Field(default=None, max_length=100)
    proposed_qty_adjustment: Optional[float] = None
    business_justification: Optional[str] = None

    # Checklist
    completed_checklist: Optional[bool] = Field(default=False)

    # SME investigation results (Planner enters this after getting feedback)
    sme_name: Optional[str] = Field(default=None, max_length=100)
    sme_email: Optional[str] = Field(default=None, max_length=100)
    sme_department: Optional[str] = Field(default=None, max_length=100)
    sme_feedback_method: Optional[str] = Field(default=None, max_length=100)
    sme_contacted_date: Optional[datetime] = Field(
        default=None, sa_column=Column(TIMESTAMP(timezone=True))
    )
    sme_responded_date: Optional[datetime] = Field(
        default=None, sa_column=Column(TIMESTAMP(timezone=True))
    )
    sme_recommendation: Optional[str] = Field(default=None, max_length=50)
    sme_recommended_qty: Optional[float] = None
    sme_analysis: Optional[str] = None
    alternative_applications: Optional[str] = None
    risk_assessment: Optional[str] = None

    # Final decision (Planner fills this out after SME feedback)
    final_decision: Optional[str] = Field(default=None, max_length=50)
    final_qty_adjustment: Optional[float] = None
    final_notes: Optional[str] = None
    decided_by: UUID = Field(
        sa_column_kwargs={
            "server_default": text(
                "auth.uid()"
            )
        }
    )
    decided_at: Optional[datetime] = Field(
        default=None, sa_column=Column(TIMESTAMP(timezone=True))
    )

    # Follow-up scheduling
    requires_follow_up: Optional[bool] = None
    next_review_date: Optional[date] = None
    follow_up_reason: Optional[str] = None
    review_frequency_weeks: Optional[int] = None

    # Link to previous review
    previous_review_id: Optional[int] = Field(
        default=None, foreign_key="material_reviews.review_id")

    # Additional tracking
    estimated_savings: Optional[float] = None
    implementation_date: Optional[date] = None

    # Workflow status
    status: str = Field(default="draft", max_length=20)

    created_at: datetime = Field(
        sa_column=Column(TIMESTAMP(timezone=True),
                         server_default=text("NOW()"))
    )
    updated_at: datetime = Field(
        sa_column=Column(TIMESTAMP(timezone=True),
                         server_default=text("NOW()"))
    )

    data_snapshot_job_id: Optional[UUID] = Field(
        default=None, foreign_key="upload_jobs.job_id")
    is_data_stale: bool = Field(default=False)
    data_stale_since: Optional[datetime] = Field(default=None)

    # Relationship to material
    material: Optional[SAPMaterialData] = Relationship(
        back_populates="reviews")


class ReviewChecklistDB(SQLModel, table=True):
    """Review Checklist table model."""

    __tablename__ = "review_checklist"

    checklist_id: Optional[int] = Field(default=None, primary_key=True)
    review_id: int = Field(foreign_key="material_reviews.review_id")

    created_by: UUID = Field(
        sa_column_kwargs={
            "server_default": text(
                "auth.uid()"
            )
        }
    )
    last_updated_by: UUID = Field(
        sa_column_kwargs={
            "server_default": text(
                "auth.uid()"
            )
        }
    )
    created_at: datetime = Field(
        sa_column=Column(TIMESTAMP(timezone=True),
                         server_default=text("NOW()"))
    )
    updated_at: datetime = Field(
        sa_column=Column(TIMESTAMP(timezone=True),
                         server_default=text("NOW()"))
    )

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


class ReviewCommentDB(SQLModel, table=True):
    """Review Comment table model."""

    __tablename__ = "review_comments"

    comment_id: Optional[int] = Field(default=None, primary_key=True)
    review_id: int = Field(foreign_key="material_reviews.review_id")
    user_id: UUID
    comment: str
    created_at: datetime = Field(
        sa_column=Column(TIMESTAMP(timezone=True),
                         server_default=text("NOW()"))
    )
    updated_at: datetime = Field(
        sa_column=Column(TIMESTAMP(timezone=True),
                         server_default=text("NOW()"))
    )


class AuditLogDB(SQLModel, table=True):
    """Audit Log table model."""

    __tablename__ = "audit_logs"

    audit_id: Optional[int] = Field(default=None, primary_key=True)
    table_name: str = Field(max_length=100)
    record_id: int
    operation: str = Field(max_length=10)
    old_values: Optional[dict[str, Any]] = Field(
        default=None, sa_column=Column(JSON))
    new_values: Optional[dict[str, Any]] = Field(
        default=None, sa_column=Column(JSON))
    fields_changed: Optional[list[str]] = Field(
        default=None, sa_column=Column(ARRAY(String))
    )
    changed_by: UUID = Field(
        sa_column_kwargs={
            "server_default": text(
                "auth.uid()"
            )
        }
    )
    changed_at: datetime = Field(
        sa_column=Column(TIMESTAMP(timezone=True),
                         server_default=text("NOW()"))
    )


class UploadJobDB(SQLModel, table=True):
    """Upload Job table model for tracking async CSV upload progress."""

    __tablename__ = "upload_jobs"

    job_id: UUID = Field(default_factory=uuid4, primary_key=True)
    status: str = Field(default="pending", max_length=20)
    total_records: int = Field(default=0)
    processed_records: int = Field(default=0)
    current_phase: Optional[str] = Field(default=None, max_length=50)
    inserted_count: int = Field(default=0)
    updated_count: int = Field(default=0)
    insights_count: int = Field(default=0)
    reviews_count: int = Field(default=0)
    error_message: Optional[str] = None
    file_name: Optional[str] = Field(default=None, max_length=255)
    file_size_bytes: Optional[int] = Field(default=None)
    file_mime_type: Optional[str] = Field(default=None, max_length=100)
    created_by: Optional[UUID] = Field(default=None, foreign_key="profiles.id")
    created_at: datetime = Field(
        sa_column=Column(TIMESTAMP(timezone=True),
                         server_default=text("NOW()"))
    )
    started_at: Optional[datetime] = Field(
        default=None, sa_column=Column(TIMESTAMP(timezone=True))
    )
    completed_at: Optional[datetime] = Field(
        default=None, sa_column=Column(TIMESTAMP(timezone=True))
    )


class MaterialDataHistory(SQLModel, table=True):
    """Material Data History table model for tracking changes across uploads."""

    __tablename__ = "material_data_history"

    history_id: Optional[int] = Field(default=None, primary_key=True)
    upload_job_id: UUID = Field(foreign_key="upload_jobs.job_id")
    material_number: int = Field(
        foreign_key="sap_material_data.material_number")
    change_type: str = Field(max_length=10)  # 'INSERT' or 'UPDATE'
    old_values: Optional[dict[str, Any]] = Field(
        default=None, sa_column=Column(JSON))
    new_values: Optional[dict[str, Any]] = Field(
        default=None, sa_column=Column(JSON))
    fields_changed: Optional[list[str]] = Field(
        default=None, sa_column=Column(ARRAY(String))
    )
    created_at: datetime = Field(
        sa_column=Column(TIMESTAMP(timezone=True),
                         server_default=text("NOW()"))
    )

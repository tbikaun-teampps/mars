"""Upload job response models."""

from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel


class UploadJobProgress(BaseModel):
    """Progress info for an upload job."""

    total: int
    processed: int
    percentage: float


class UploadJobResult(BaseModel):
    """Result info for a completed upload job."""

    inserted: int
    updated: int
    insights: int
    reviews: int


class UploadJobStatus(BaseModel):
    """Upload job status response model."""

    job_id: str
    status: Literal["pending", "processing", "completed", "failed"]
    current_phase: Optional[Literal["validating", "materials", "history", "insights", "reviews"]] = None
    progress: UploadJobProgress
    file_name: Optional[str] = None
    file_size_bytes: Optional[int] = None
    file_mime_type: Optional[str] = None
    created_at: Optional[str] = None
    started_at: Optional[str] = None
    completed_at: Optional[str] = None
    result: Optional[UploadJobResult] = None
    error: Optional[str] = None


class UploadJobListResponse(BaseModel):
    """Paginated list of upload jobs."""

    jobs: list[UploadJobStatus]
    total: int


class UploadSAPDataResponse(BaseModel):
    """Response from initiating a SAP data upload."""

    job_id: str
    status: Literal["pending"]
    message: str

-- Add upload_jobs table for tracking async CSV upload progress
-- This enables background processing with progress polling

CREATE TABLE upload_jobs (
    job_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    total_records INTEGER DEFAULT 0,
    processed_records INTEGER DEFAULT 0,
    current_phase VARCHAR(50),  -- 'validating', 'materials', 'insights', 'reviews'
    inserted_count INTEGER DEFAULT 0,
    updated_count INTEGER DEFAULT 0,
    insights_count INTEGER DEFAULT 0,
    reviews_count INTEGER DEFAULT 0,
    error_message TEXT,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
);

-- Index for querying jobs by status (find stuck jobs)
CREATE INDEX idx_upload_jobs_status ON upload_jobs(status);

-- Index for querying user's jobs
CREATE INDEX idx_upload_jobs_created_by ON upload_jobs(created_by);

-- Index for cleanup of old jobs
CREATE INDEX idx_upload_jobs_created_at ON upload_jobs(created_at);

COMMENT ON TABLE upload_jobs IS 'Tracks async CSV upload jobs for progress polling';
COMMENT ON COLUMN upload_jobs.current_phase IS 'Current processing phase: validating, materials, insights, reviews';
COMMENT ON COLUMN upload_jobs.status IS 'Job status: pending, processing, completed, failed';

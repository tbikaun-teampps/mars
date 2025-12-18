-- Add upload_snapshots table

CREATE TABLE IF NOT EXISTS upload_snapshots (
    snapshot_id UUID PRIMARY KEY,
    upload_job_id UUID NOT NULL REFERENCES upload_jobs(job_id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    prev_snapshot_id UUID REFERENCES upload_snapshots(snapshot_id),

    -- Inventory metrics
    total_inventory_value NUMERIC(20, 6) NOT NULL,
    -- total_items_count BIGINT NOT NULL,

    -- Opportunity metrics
    total_opportunity_value NUMERIC(20, 6) NOT NULL,
    -- total_opportunity_items_count BIGINT NOT NULL,

    -- Review metrics
    total_overdue_reviews BIGINT NOT NULL,
    agreement_rate NUMERIC(5, 4) NOT NULL
);
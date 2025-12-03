CREATE TABLE public.material_data_history (
    history_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    
    -- Link to the upload that caused this snapshot
    upload_job_id uuid NOT NULL REFERENCES upload_jobs(job_id),
    
    -- The material
    material_number integer NOT NULL REFERENCES sap_material_data(material_number),
    
    -- What happened
    change_type varchar NOT NULL CHECK (change_type IN ('INSERT', 'UPDATE')),
    
    -- The diff (for UPDATE, what fields changed)
    old_values jsonb,          -- Previous state (null for INSERT)
    new_values jsonb,          -- New state
    fields_changed text[],     -- e.g., ['total_quantity', 'total_value']
    
    -- Audit
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX idx_material_history_material ON material_data_history(material_number);
CREATE INDEX idx_material_history_upload ON material_data_history(upload_job_id);


-- Extend material_reviews to track data snapshot status
ALTER TABLE material_reviews 
    ADD COLUMN data_snapshot_job_id uuid REFERENCES upload_jobs(job_id),
    ADD COLUMN is_data_stale boolean DEFAULT false,
    ADD COLUMN data_stale_since timestamptz;
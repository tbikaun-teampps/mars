-- Add audit logging
-- This migration creates a system-wide audit log

-- Create audit_logs table for tracking all changes
CREATE TABLE audit_logs (
    audit_id BIGSERIAL PRIMARY KEY,
    table_name VARCHAR(100) NOT NULL,
    record_id INTEGER NOT NULL,
    operation VARCHAR(10) NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
    old_values JSONB,
    new_values JSONB,
    fields_changed TEXT[],
    changed_by UUID NOT NULL DEFAULT auth.uid(),
    changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX idx_audit_logs_table_record ON audit_logs(table_name, record_id);
CREATE INDEX idx_audit_logs_changed_at ON audit_logs(changed_at DESC);
CREATE INDEX idx_audit_logs_table_name ON audit_logs(table_name);

-- Create trigger function to log changes to material_reviews
CREATE OR REPLACE FUNCTION log_material_review_changes()
RETURNS TRIGGER 
SECURITY INVOKER
AS $$
DECLARE
    changed_fields TEXT[];
    old_json JSONB;
    new_json JSONB;
BEGIN

    IF (TG_OP = 'UPDATE') THEN
        -- Convert rows to JSON for comparison
        old_json := row_to_json(OLD)::jsonb;
        new_json := row_to_json(NEW)::jsonb;

        -- Find fields that have changed
        changed_fields := ARRAY(
            SELECT k
            FROM jsonb_object_keys(new_json) AS k
            WHERE old_json -> k IS DISTINCT FROM new_json -> k
        );

        INSERT INTO audit_logs (table_name, record_id, operation, old_values, new_values, fields_changed, changed_by)
        VALUES (
            'material_reviews',
            NEW.review_id,
            'UPDATE',
            old_json,
            new_json,
            changed_fields,
            NEW.last_updated_by  -- Use the person making this update
        );
        RETURN NEW;
    ELSIF (TG_OP = 'INSERT') THEN
        INSERT INTO audit_logs (table_name, record_id, operation, old_values, new_values, fields_changed, changed_by)
        VALUES (
            'material_reviews',
            NEW.review_id,
            'INSERT',
            NULL,
            row_to_json(NEW)::jsonb,
            NULL,  -- All fields are new
            NEW.created_by  -- Use the person who created it
        );
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on material_reviews table
CREATE TRIGGER material_reviews_audit_trigger
AFTER INSERT OR UPDATE OR DELETE ON material_reviews
FOR EACH ROW EXECUTE FUNCTION log_material_review_changes();

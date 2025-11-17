-- Add audit logging for review_checklist table
-- This migration adds user tracking and audit triggers for checklist changes

-- Add user tracking columns to review_checklist
-- For existing rows, we'll use auth.uid() as default, then remove the default
-- This ensures the migration works even if there are existing checklist records
ALTER TABLE review_checklist
ADD COLUMN created_by UUID NOT NULL DEFAULT auth.uid() REFERENCES profiles(id),
ADD COLUMN last_updated_by UUID NOT NULL DEFAULT auth.uid() REFERENCES profiles(id);

-- Remove the defaults so future inserts must provide explicit user values
ALTER TABLE review_checklist
ALTER COLUMN created_by DROP DEFAULT,
ALTER COLUMN last_updated_by DROP DEFAULT;

-- Create trigger function to log changes to review_checklist
CREATE OR REPLACE FUNCTION log_review_checklist_changes()
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
            'review_checklist',
            NEW.checklist_id,
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
            'review_checklist',
            NEW.checklist_id,
            'INSERT',
            NULL,
            row_to_json(NEW)::jsonb,
            NULL,  -- All fields are new
            NEW.created_by  -- Use the person who created it
        );
        RETURN NEW;
    ELSIF (TG_OP = 'DELETE') THEN
        INSERT INTO audit_logs (table_name, record_id, operation, old_values, new_values, fields_changed, changed_by)
        VALUES (
            'review_checklist',
            OLD.checklist_id,
            'DELETE',
            row_to_json(OLD)::jsonb,
            NULL,
            NULL,
            auth.uid()  -- Use current session user for deletes
        );
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on review_checklist table
CREATE TRIGGER review_checklist_audit_trigger
AFTER INSERT OR UPDATE OR DELETE ON review_checklist
FOR EACH ROW EXECUTE FUNCTION log_review_checklist_changes();

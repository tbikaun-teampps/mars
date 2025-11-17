-- Fix review_comments table and add audit logging
-- This migration fixes the incorrect default value on the comment field
-- and adds audit triggers for comment tracking

-- Fix the comment field default value (currently incorrectly set to auth.uid())
ALTER TABLE review_comments
ALTER COLUMN comment DROP DEFAULT;

-- Add updated_at column for future edit tracking
ALTER TABLE review_comments
ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Create trigger function to log changes to review_comments
CREATE OR REPLACE FUNCTION log_review_comments_changes()
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
            'review_comments',
            NEW.comment_id,
            'UPDATE',
            old_json,
            new_json,
            changed_fields,
            NEW.user_id  -- Use the comment author
        );
        RETURN NEW;
    ELSIF (TG_OP = 'INSERT') THEN
        INSERT INTO audit_logs (table_name, record_id, operation, old_values, new_values, fields_changed, changed_by)
        VALUES (
            'review_comments',
            NEW.comment_id,
            'INSERT',
            NULL,
            row_to_json(NEW)::jsonb,
            NULL,  -- All fields are new
            NEW.user_id  -- Use the comment author
        );
        RETURN NEW;
    ELSIF (TG_OP = 'DELETE') THEN
        INSERT INTO audit_logs (table_name, record_id, operation, old_values, new_values, fields_changed, changed_by)
        VALUES (
            'review_comments',
            OLD.comment_id,
            'DELETE',
            row_to_json(OLD)::jsonb,
            NULL,
            NULL,
            OLD.user_id  -- Use the comment author
        );
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on review_comments table
CREATE TRIGGER review_comments_audit_trigger
AFTER INSERT OR UPDATE OR DELETE ON review_comments
FOR EACH ROW EXECUTE FUNCTION log_review_comments_changes();

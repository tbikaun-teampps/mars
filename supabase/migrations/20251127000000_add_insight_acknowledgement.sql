-- Add insight acknowledgement functionality
-- This migration adds columns to track when insights are acknowledged and by whom

-- Add acknowledgement columns to material_insights
ALTER TABLE material_insights
ADD COLUMN acknowledged_at TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN acknowledged_by UUID DEFAULT NULL REFERENCES profiles(id),
ADD COLUMN last_modified_by UUID DEFAULT NULL REFERENCES profiles(id);

-- Create index for filtering acknowledged/unacknowledged insights
CREATE INDEX idx_material_insights_acknowledged ON material_insights(acknowledged_at);

-- Create audit trigger function for material_insights table
-- Only tracks UPDATE operations (acknowledgements), not INSERT (batch data upload has no user context)
CREATE OR REPLACE FUNCTION log_material_insight_changes()
RETURNS TRIGGER
SECURITY INVOKER
AS $$
DECLARE
    changed_fields TEXT[];
    old_json JSONB;
    new_json JSONB;
    user_id UUID;
BEGIN
    -- Only audit UPDATE operations (acknowledgements)
    -- INSERT operations happen during batch data upload without user context
    IF (TG_OP = 'UPDATE') THEN
        -- Get the user who made this change from last_modified_by (set by API)
        user_id := COALESCE(NEW.last_modified_by, auth.uid());

        -- Skip audit if we can't identify the user
        IF user_id IS NULL THEN
            RETURN NEW;
        END IF;

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
            'material_insights',
            NEW.insight_id,
            'UPDATE',
            old_json,
            new_json,
            changed_fields,
            user_id
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on material_insights table (UPDATE only)
CREATE TRIGGER material_insights_audit_trigger
AFTER UPDATE ON material_insights
FOR EACH ROW EXECUTE FUNCTION log_material_insight_changes();

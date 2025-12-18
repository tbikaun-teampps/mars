-- Update the status check constraint to include pending_assignment
ALTER TABLE material_reviews
DROP CONSTRAINT material_reviews_status_check;

ALTER TABLE material_reviews
ADD CONSTRAINT material_reviews_status_check
CHECK (status IN ('draft', 'pending_assignment', 'pending_sme', 'pending_decision', 'completed', 'cancelled'));
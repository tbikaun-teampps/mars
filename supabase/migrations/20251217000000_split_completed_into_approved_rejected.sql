-- Migration: Split COMPLETED status into APPROVED and REJECTED
-- This migration updates the review status enum to have separate terminal states
-- for approved and rejected reviews.

-- Step 1: Drop the old constraint
ALTER TABLE material_reviews
DROP CONSTRAINT material_reviews_status_check;

-- Step 2: Update existing 'completed' reviews to 'approved'
-- All previously completed reviews are treated as approved since there was no
-- rejection workflow before this change.
UPDATE material_reviews
SET status = 'approved'
WHERE status = 'completed';

-- Step 3: Add the new constraint with approved/rejected instead of completed
ALTER TABLE material_reviews
ADD CONSTRAINT material_reviews_status_check
CHECK (status IN ('draft', 'pending_assignment', 'pending_sme', 'pending_decision', 'approved', 'rejected', 'cancelled'));

-- Note: The application code now uses 'approved' and 'rejected' as the terminal
-- states instead of just 'completed'. The enum values are:
-- - draft
-- - pending_assignment
-- - pending_sme
-- - pending_decision
-- - approved (new - replaces completed for approved reviews)
-- - rejected (new - for rejected reviews)
-- - cancelled
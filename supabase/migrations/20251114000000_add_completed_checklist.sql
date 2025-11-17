-- Add completed_checklist column to material_reviews table
-- This tracks whether the checklist step (Step 2) has been completed

ALTER TABLE material_reviews
ADD COLUMN completed_checklist BOOLEAN DEFAULT false;

-- Add index on status column for better query performance
CREATE INDEX IF NOT EXISTS idx_material_reviews_status ON material_reviews(status);

-- Add comment for documentation
COMMENT ON COLUMN material_reviews.completed_checklist IS 'Indicates whether Step 2 (checklist verification) has been completed';

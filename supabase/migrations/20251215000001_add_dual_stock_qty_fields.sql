-- Add separate quantity fields for each stock type
-- This replaces the single stock_type + proposed_qty_adjustment approach
-- with separate fields for safety stock and unrestricted stock

ALTER TABLE material_reviews
  ADD COLUMN proposed_safety_stock_qty DOUBLE PRECISION,
  ADD COLUMN proposed_unrestricted_qty DOUBLE PRECISION,
  ADD COLUMN sme_recommended_safety_stock_qty DOUBLE PRECISION,
  ADD COLUMN sme_recommended_unrestricted_qty DOUBLE PRECISION,
  ADD COLUMN final_safety_stock_qty DOUBLE PRECISION,
  ADD COLUMN final_unrestricted_qty DOUBLE PRECISION;

-- Drop the old columns
ALTER TABLE material_reviews
  DROP COLUMN IF EXISTS stock_type,
  DROP COLUMN IF EXISTS proposed_qty_adjustment,
  DROP COLUMN IF EXISTS sme_recommended_qty,
  DROP COLUMN IF EXISTS final_qty_adjustment;

-- Drop the enum type
DROP TYPE IF EXISTS stock_type_enum;

-- Add stock_type enum and column to material_reviews table
-- This tracks which stock type is being adjusted in a review

-- Create enum type for stock types
CREATE TYPE stock_type_enum AS ENUM ('safety_stock', 'unrestricted_stock');

-- Add stock_type column to material_reviews table
ALTER TABLE material_reviews
ADD COLUMN stock_type stock_type_enum;

COMMENT ON COLUMN material_reviews.stock_type IS 'Which stock type is being adjusted: safety_stock or unrestricted_stock';
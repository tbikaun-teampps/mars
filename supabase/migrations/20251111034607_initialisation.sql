-- Database initialisation migration
-- This migration sets up the initial database schema for the application.

-- Create user profile table
CREATE TABLE profiles (
    id UUID PRIMARY KEY,
    full_name TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    is_admin BOOLEAN DEFAULT false
);

-- Add trigger function to add a profile on user creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name)
    VALUES (NEW.id, split_part(NEW.email, '@', 1));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION handle_new_user();


-- Create materials table
CREATE TABLE sap_material_data (
    material_number INTEGER NOT NULL PRIMARY KEY,
    material_desc TEXT,
    material_type VARCHAR(20),
    mat_group VARCHAR(20),
    mat_group_desc TEXT,
    mrp_controller VARCHAR(50),
    plant VARCHAR(50),
    created_on DATE,
    total_quantity DOUBLE PRECISION,
    total_value DOUBLE PRECISION,
    unrestricted_quantity DOUBLE PRECISION,
    unrestricted_value DOUBLE PRECISION,
    safety_stock DOUBLE PRECISION,
    coverage_ratio DOUBLE PRECISION, -- Stock / Av Consump 3 Years
    max_cons_demand DOUBLE PRECISION, -- Max of Cons Av. & 12m Demand
    demand_fc_12m DOUBLE PRECISION,
    demand_fc_total DOUBLE PRECISION,
    cons_1y DOUBLE PRECISION,  -- Year 1 Cons
    cons_2y DOUBLE PRECISION,  -- Year 2 Cons
    cons_3y DOUBLE PRECISION,  -- Year 3 Cons
    cons_4y DOUBLE PRECISION,  -- Year 4 Cons
    cons_5y DOUBLE PRECISION,  -- Year 5 Cons
    purchased_qty_2y DOUBLE PRECISION,
    last_reviewed DATE,
    next_review DATE,
    review_notes TEXT,
    uploaded_at TIMESTAMPTZ DEFAULT now()
);

-- Create insights table
CREATE TABLE material_insights (
    insight_id SERIAL PRIMARY KEY,
    material_number INTEGER NOT NULL,
    message TEXT NOT NULL,

    opportunity_value DOUBLE PRECISION,

    insight_type VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    FOREIGN KEY (material_number) REFERENCES sap_material_data(material_number)
);

-- Create material reviews table
CREATE TABLE material_reviews (
    review_id SERIAL PRIMARY KEY,
    material_number INTEGER NOT NULL, 

    -- Audit fields
    created_by UUID NOT NULL DEFAULT auth.uid(),
    last_updated_by UUID NOT NULL DEFAULT auth.uid(),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),

    -- Initiator (MRP Planner) info
    initiated_by UUID NOT NULL DEFAULT auth.uid(),
    review_date DATE NOT NULL DEFAULT CURRENT_DATE,

    -- Structured form fields (Planner fills these out)
    review_reason VARCHAR(100),               -- PRIMARY trigger for this review:
                                              -- 'no_movement' = Zero consumption for extended period
                                              -- 'excess_stock' = Coverage exceeds target (e.g., >365 days)
                                              -- 'obsolete' = Product/part officially discontinued
                                              -- 'slow_moving' = Consumption declining significantly
                                              -- 'quality_issue' = Material failed quality/shelf-life
                                              -- 'damaged' = Physical damage/deterioration
                                              -- 'project_cancelled' = Procured for cancelled project
                                              -- 'engineering_change' = Design change made part obsolete
    current_stock_qty DOUBLE PRECISION,       -- ACTUAL quantity on hand right now
                                              -- From SAP: unrestricted + quality inspection + blocked
    current_stock_value DOUBLE PRECISION,     -- FINANCIAL impact: Total value at standard cost
                                              -- Helps prioritize reviews (focus on high-value first)
    months_no_movement INTEGER,               -- How many months since last consumption?
                                              -- >12 months = concerning, >24 months = critical
    proposed_action VARCHAR(100),             -- What does planner recommend AFTER initial analysis:
                                              -- 'scrap' = Dispose/write-off completely
                                              -- 'reduce_stock' = Keep some, scrap excess
                                              -- 'keep_stock' = Maintain current levels
                                              -- 'return_to_vendor' = Try to return for credit
                                              -- 'sell_surplus' = Attempt to sell to surplus market
                                              -- 'transfer_plant' = Move to another facility
                                              -- 'donate' = Donate for tax write-off
                                              -- 'recycle' = Send to recycling (may have value)
                                              -- 'rework' = Can be modified/reworked into usable material
    proposed_qty_adjustment DOUBLE PRECISION, -- Specific quantity change proposed:
                                              -- Negative = reduce (e.g., -800 means scrap 800 units)
                                              -- Positive = rare, maybe for transfers in
                                              -- NULL = keep as is
    business_justification TEXT,              -- DETAILED explanation of why this action makes sense
                                              -- Should reference: consumption trends, business changes,
                                              -- product lifecycle, cost of holding vs risk of stockout
                                              -- This is the "story" that justifies the decision


    -- Checklist
    checklist_completed BOOLEAN DEFAULT false, -- Has the planner completed the review checklist?


    -- SME investigation results (Planner enters this after getting feedback)
    sme_name VARCHAR(100),
    sme_email VARCHAR(100),
    sme_department VARCHAR(100),              -- 'Maintenance', 'Reliability', 'Operations'
    sme_feedback_method VARCHAR(100),         -- 'email', 'call', 'meeting', etc.
    sme_contacted_date TIMESTAMPTZ,
    sme_responded_date TIMESTAMPTZ,
    sme_recommendation VARCHAR(50),           -- 'scrap', 'reduce', 'keep', 'alternative_use'
    sme_recommended_qty DOUBLE PRECISION,
    sme_analysis TEXT,                        -- SME's detailed feedback, could include:
                                              -- - Is this a critical spare?
                                              -- - Equipment still in service?
                                              -- - Failure risk assessment
                                              -- - Upcoming overhauls needing this part
                                              -- - Can equipment run without it?
    alternative_applications TEXT, -- Other uses suggested by SME
    risk_assessment TEXT,

    -- Final decision (Planner fills this out after SME feedback)
    final_decision VARCHAR(50), -- 'approve_scrap', 'approve_reduce', 'reject', 'defer', etc.
    final_qty_adjustment DOUBLE PRECISION,
    final_notes TEXT,
    decided_by UUID DEFAULT auth.uid(), -- Might be different from initiator
    decided_at TIMESTAMPTZ,

    -- Follow-up scheduling
    requires_follow_up BOOLEAN DEFAULT false,
    next_review_date DATE, -- When should this be reviewed again
    follow_up_reason TEXT, -- Why we need to review again
    review_frequency_weeks INTEGER, -- Number of weeks between reviews
  
    -- Link to previous review
    previous_review_id INTEGER REFERENCES material_reviews(review_id),

    -- Additional tracking
    estimated_savings DOUBLE PRECISION, -- Financial impact
    implementation_date DATE,   -- When will this actually happen

    -- Metadata
    is_superseded BOOLEAN DEFAULT false, -- Has a later review superseded this one?

    -- Workflow status  
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending_sme', 'pending_decision', 'completed', 'cancelled')),

    FOREIGN KEY (material_number) REFERENCES sap_material_data(material_number)
);

-- Create review checklist table
-- This table captures the detailed checklist that planners must complete during the review process
CREATE TABLE public.review_checklist (
  checklist_id SERIAL PRIMARY KEY,
  review_id INTEGER NOT NULL REFERENCES material_reviews(review_id) ON DELETE CASCADE,
  
  -- ============ EXISTING DEMAND VERIFICATION ============
  has_open_orders BOOLEAN NOT NULL,           -- Are there ANY open POs, reservations, work orders?
                                              -- TRUE = Cannot scrap, material is committed
                                              -- FALSE = No immediate demand
  has_forecast_demand BOOLEAN NOT NULL,       -- Does MRP/planning show ANY future demand in the system?
                                              -- TRUE = Expected future consumption, be cautious
                                              -- FALSE = No system demand visible
  checked_alternate_plants BOOLEAN NOT NULL,  -- Have you verified if OTHER company locations could use this material?
                                              -- TRUE = Confirmed no other sites/depots/warehouses need it (or transferred)
                                              -- FALSE = Haven't checked cross-plant requirements
  contacted_procurement BOOLEAN NOT NULL,     -- Has purchasing/procurement team been consulted about this material?
                                              -- TRUE = Vendor status, min order qty, lead times checked
                                              -- FALSE = Risk of scrapping something hard to re-procure
  reviewed_bom_usage BOOLEAN NOT NULL,        -- Is this material a component in ANY bills of materials (BOMs)?
                                              -- TRUE = Checked all product structures
                                              -- FALSE = Could be needed for production/assembly
  checked_supersession BOOLEAN NOT NULL,      -- Has this part been REPLACED by a newer part number?
                                              -- TRUE = Verified if obsolete or still current
                                              -- FALSE = Might be scrapping current material
  checked_historical_usage BOOLEAN NOT NULL,  -- Reviewed consumption history?
                                              -- TRUE = Checked 2-3 year trend

  -- Additional context
  open_order_numbers TEXT,                    -- Comma-separated list of of specific order numbers (work orders, POs, etc.) if has_open_orders = TRUE
                                              -- e.g., 'SO-2024-1234,PO-2024-5678'
  forecast_next_12m DOUBLE PRECISION,         -- Total forecasted quantity for next 12 months
                                              -- NULL or 0 supports disposal decision
  alternate_plant_qty DOUBLE PRECISION,       -- Total quantity at other plants/locations
                                              -- Helps identify if consolidation is needed vs disposal
  procurement_feedback TEXT,                  -- Notes from procurement team consultation
                                              -- e.g., "Vendor still active, 180-day lead time"
                                              -- Critical for understanding replacement difficulty
  
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Simple attachments table for email threads, reports, etc.
CREATE TABLE public.review_attachments (
  attachment_id SERIAL PRIMARY KEY,
  review_id INTEGER NOT NULL REFERENCES material_reviews(review_id) ON DELETE CASCADE,
  file_name VARCHAR(255) NOT NULL,
  file_type VARCHAR(50), -- 'email', 'excel', 'pdf', etc.
  file_url TEXT, -- S3 or blob storage URL
  description TEXT,
  uploaded_by UUID NOT NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.review_comments (
  comment_id SERIAL PRIMARY KEY,
  review_id INTEGER NOT NULL REFERENCES material_reviews(review_id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  comment TEXT NOT NULL DEFAULT auth.uid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


CREATE TABLE public.review_schedules (
  schedule_id SERIAL PRIMARY KEY,
  material_number INTEGER NOT NULL REFERENCES sap_material_data(material_number),
  
  -- Scheduling info
  is_active BOOLEAN DEFAULT true,
  frequency VARCHAR(20) NOT NULL, -- 'monthly', 'quarterly', 'semi-annual', 'annual'
  next_review_date DATE NOT NULL,
  
  -- Context from last review
  last_review_id INTEGER REFERENCES material_reviews(review_id),
  last_review_decision VARCHAR(50),
  monitoring_reason TEXT, -- "Waiting for project X", "Monitoring consumption trend", etc.
  
  -- Auto-assign settings (optional)
  default_reviewer UUID,
  default_sme_name VARCHAR(100),
  default_sme_email VARCHAR(100),
  
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);


-- Create indexes for sap_material_data
CREATE INDEX idx_sap_material_material_type ON sap_material_data(material_type);
CREATE INDEX idx_sap_material_plant ON sap_material_data(plant);
CREATE INDEX idx_sap_material_mrp_controller ON sap_material_data(mrp_controller);
CREATE INDEX idx_sap_material_next_review ON sap_material_data(next_review);
CREATE INDEX idx_sap_material_last_reviewed ON sap_material_data(last_reviewed);

-- Create indexes for material_insights
CREATE INDEX idx_material_insights_material_number ON material_insights(material_number);

-- Create indexes for material_reviews
CREATE INDEX idx_material_reviews_material_number ON material_reviews(material_number);
CREATE INDEX idx_material_reviews_review_date ON material_reviews(review_date);
CREATE INDEX idx_material_reviews_next_review_date ON material_reviews(next_review_date);
CREATE INDEX idx_material_reviews_initiated_by ON material_reviews(initiated_by);


CREATE INDEX idx_review_schedules_next_date ON review_schedules(next_review_date, is_active);
CREATE INDEX idx_material_reviews_next_review ON material_reviews(next_review_date, status);


-- Ensure logical date ordering
ALTER TABLE material_reviews 
ADD CONSTRAINT check_sme_dates 
CHECK (sme_contacted_date IS NULL OR sme_responded_date IS NULL OR sme_contacted_date <= sme_responded_date);

-- -- Ensure savings is positive
-- ALTER TABLE material_reviews 
-- ADD CONSTRAINT check_positive_savings 
-- CHECK (estimated_savings IS NULL OR estimated_savings >= 0);

-- -- Ensure quantity adjustment makes sense with action
-- ALTER TABLE material_reviews
-- ADD CONSTRAINT check_qty_adjustment
-- CHECK (
--     (final_decision IN ('approve_scrap', 'approve_reduce') AND final_qty_adjustment < 0) OR
--     (final_decision IN ('reject', 'defer', 'keep_stock') AND (final_qty_adjustment = 0 OR final_qty_adjustment IS NULL)) OR
--     final_decision IS NULL
-- );


-- -- Trigger to validate status transitions and required fields on updates to material_reviews
-- CREATE OR REPLACE FUNCTION validate_review_status_change()
-- RETURNS TRIGGER AS $$
-- BEGIN
--     -- Only validate if status is changing from draft
--     IF OLD.status = 'draft' AND NEW.status != 'draft' AND NEW.status != 'cancelled' THEN
        
--         -- Check required fields for moving out of draft
--         IF NEW.review_reason IS NULL THEN
--             RAISE EXCEPTION 'review_reason is required to move out of draft status';
--         END IF;
        
--         IF NEW.current_stock_qty IS NULL THEN
--             RAISE EXCEPTION 'current_stock_qty is required to move out of draft status';
--         END IF;
        
--         IF NEW.current_stock_value IS NULL THEN
--             RAISE EXCEPTION 'current_stock_value is required to move out of draft status';
--         END IF;
        
--         IF NEW.proposed_action IS NULL THEN
--             RAISE EXCEPTION 'proposed_action is required to move out of draft status';
--         END IF;
        
--         IF NEW.business_justification IS NULL OR LENGTH(TRIM(NEW.business_justification)) = 0 THEN
--             RAISE EXCEPTION 'business_justification is required to move out of draft status';
--         END IF;
--     END IF;

--     -- Validate status transitions for other stages
--     IF OLD.status = 'pending_sme' AND NEW.status = 'pending_decision' THEN
--         -- Ensure SME fields are filled
--         IF NEW.sme_name IS NULL THEN
--             RAISE EXCEPTION 'SME contact information must be recorded before moving to pending_decision';
--         END IF;
        
--         IF NEW.sme_recommendation IS NULL THEN
--             RAISE EXCEPTION 'SME recommendation must be recorded before moving to pending_decision';
--         END IF;
--     END IF;

--     -- Validate completion
--     IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
--         IF NEW.final_decision IS NULL THEN
--             RAISE EXCEPTION 'final_decision is required to complete the review';
--         END IF;
        
--         IF NEW.decided_by IS NULL THEN
--             NEW.decided_by = NEW.initiated_by; -- Default to initiator
--         END IF;
        
--         IF NEW.decided_at IS NULL THEN
--             NEW.decided_at = NOW();
--         END IF;
--     END IF;

--     RETURN NEW;
-- END;
-- $$ LANGUAGE plpgsql;

-- CREATE TRIGGER validate_review_status
--     BEFORE UPDATE ON material_reviews
--     FOR EACH ROW
--     EXECUTE FUNCTION validate_review_status_change();
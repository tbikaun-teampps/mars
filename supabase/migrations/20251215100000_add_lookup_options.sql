-- Migration: Add lookup_options table for dynamic configurable labels
-- This allows admins to configure dropdown options (like review_reason) without code changes

-- Create lookup_options table
CREATE TABLE lookup_options (
    option_id SERIAL PRIMARY KEY,
    category VARCHAR(50) NOT NULL,          -- e.g. 'review_reason', 'proposed_action'
    value VARCHAR(100) NOT NULL,            -- e.g. 'annual_review', 'write_off_scrap'
    label VARCHAR(200) NOT NULL,            -- e.g. 'Annual Review', 'Write Off - Scrap'
    description TEXT,                       -- Help text for users

    color VARCHAR(7),                       -- hex color e.g. '#3b82f6'

    -- Grouping & ordering
    group_name VARCHAR(100),                -- e.g. 'Scheduled Reviews', 'Write-Off & Dispose'
    group_order INTEGER DEFAULT 0,          -- Order of group in dropdown
    sort_order INTEGER DEFAULT 0,           -- Order within group

    is_active BOOLEAN DEFAULT true,         -- Soft disable without breaking history

    -- Audit fields
    created_by UUID DEFAULT auth.uid(),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_by UUID DEFAULT auth.uid(),
    updated_at TIMESTAMPTZ DEFAULT now(),

    UNIQUE (category, value)
);

-- Create history table for audit trail
CREATE TABLE lookup_options_history (
    history_id SERIAL PRIMARY KEY,
    option_id INTEGER NOT NULL REFERENCES lookup_options(option_id),
    change_type VARCHAR(20) NOT NULL,       -- 'created', 'updated', 'deactivated', 'reactivated'
    old_values JSONB,
    new_values JSONB,
    changed_by UUID DEFAULT auth.uid(),
    changed_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for common queries
CREATE INDEX idx_lookup_options_category ON lookup_options(category);
CREATE INDEX idx_lookup_options_active ON lookup_options(category, is_active);
CREATE INDEX idx_lookup_history_option ON lookup_options_history(option_id);

-- Seed existing review_reason values (matching current hardcoded options)
INSERT INTO lookup_options (category, value, label, description, color, group_name, group_order, sort_order) VALUES
('review_reason', 'annual_review', 'Annual Review', 'Scheduled yearly review of material stock levels', '#3b82f6', 'Scheduled', 1, 1),
('review_reason', 'usage_spike', 'Usage Spike', 'Unexpected increase in consumption requiring review', '#eab308', 'Triggered', 2, 1),
('review_reason', 'supplier_change', 'Supplier Change', 'Vendor or supply chain change affecting material', '#8b5cf6', 'Triggered', 2, 2);

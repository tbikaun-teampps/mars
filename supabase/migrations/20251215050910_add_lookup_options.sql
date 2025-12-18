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

    -- Category-specific configuration (e.g., workflow flags for proposed_action)
    config JSONB DEFAULT '{}',

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
CREATE INDEX idx_lookup_options_config ON lookup_options USING gin (config);


-- ============================================================================
-- REVIEW REASON
-- ============================================================================

-- Scheduled Reviews (Blue tones)
INSERT INTO lookup_options (category, value, label, description, color, group_name, group_order, sort_order) VALUES
('review_reason', 'annual_review', 'Annual Review', 'Routine yearly review of stock levels and holding justification', '#3b82f6', 'Scheduled Reviews', 1, 1),
('review_reason', 'safety_stock_review', 'Safety Stock Level Review', 'Reassessment of minimum stock levels based on demand or lead time changes', '#2563eb', 'Scheduled Reviews', 1, 2),
('review_reason', 'critical_spares_review', 'Critical Spares Review', 'Review of spares held to prevent extended asset downtime', '#1d4ed8', 'Scheduled Reviews', 1, 3),
('review_reason', 'insurance_spares_review', 'Insurance Spares Review', 'Review of high-value spares held for catastrophic failure scenarios', '#1e40af', 'Scheduled Reviews', 1, 4);

-- Inventory Health (Amber/Yellow tones)
INSERT INTO lookup_options (category, value, label, description, color, group_name, group_order, sort_order) VALUES
('review_reason', 'usage_spike', 'Usage Spike', 'Unexpected increase in consumption requiring stock level reassessment', '#f59e0b', 'Inventory Health', 2, 1),
('review_reason', 'slow_moving_stock', 'Slow Moving Stock', 'Items with consumption below expected levels (typically 12-24 months)', '#d97706', 'Inventory Health', 2, 2),
('review_reason', 'dead_stock', 'Dead Stock / No Movement', 'Items with zero consumption for an extended period (typically 24+ months)', '#b45309', 'Inventory Health', 2, 3),
('review_reason', 'excess_inventory', 'Excess Inventory', 'Stock quantity exceeds foreseeable demand based on current usage rates', '#92400e', 'Inventory Health', 2, 4),
('review_reason', 'inventory_discrepancy', 'Inventory Count Discrepancy', 'Physical count differs from system quantity, requiring investigation', '#eab308', 'Inventory Health', 2, 5),
('review_reason', 'reorder_point_review', 'Reorder Point Review', 'Reassessment of when to trigger replenishment orders', '#ca8a04', 'Inventory Health', 2, 6);

-- Quality & Condition (Red/Orange tones)
INSERT INTO lookup_options (category, value, label, description, color, group_name, group_order, sort_order) VALUES
('review_reason', 'quality_issue', 'Quality Issue / Failed Inspection', 'Material failed quality inspection or does not meet specifications', '#ef4444', 'Quality & Condition', 3, 1),
('review_reason', 'damage_deterioration', 'Damage / Deterioration', 'Physical damage during handling or storage degradation', '#dc2626', 'Quality & Condition', 3, 2),
('review_reason', 'shelf_life_expiry', 'Shelf Life Expiration', 'Material approaching or past manufacturer shelf life limits', '#b91c1c', 'Quality & Condition', 3, 3),
('review_reason', 'corrosion', 'Corrosion / Storage Degradation', 'Material condition affected by environmental factors during storage', '#f97316', 'Quality & Condition', 3, 4),
('review_reason', 'failed_bench_test', 'Failed Bench Test', 'Rotable or repairable failed functional testing', '#ea580c', 'Quality & Condition', 3, 5),
('review_reason', 'contamination', 'Contamination', 'Material contaminated and unfit for intended use', '#c2410c', 'Quality & Condition', 3, 6);

-- Equipment & Fleet Changes (Purple tones)
INSERT INTO lookup_options (category, value, label, description, color, group_name, group_order, sort_order) VALUES
('review_reason', 'asset_decommission', 'Asset Decommissioning / Retirement', 'Parent equipment being permanently removed from service', '#8b5cf6', 'Equipment & Fleet Changes', 4, 1),
('review_reason', 'fleet_reduction', 'Fleet Reduction', 'Reduction in number of assets requiring this material', '#7c3aed', 'Equipment & Fleet Changes', 4, 2),
('review_reason', 'equipment_relocation', 'Equipment Relocation', 'Asset moving to different site affecting local stock requirements', '#6d28d9', 'Equipment & Fleet Changes', 4, 3),
('review_reason', 'asset_sale', 'Asset Sale / Disposal', 'Equipment being sold, triggering review of dedicated spares', '#5b21b6', 'Equipment & Fleet Changes', 4, 4),
('review_reason', 'site_closure', 'Mine Closure / Site Closure', 'Site ceasing operations, requiring full inventory disposition', '#4c1d95', 'Equipment & Fleet Changes', 4, 5),
('review_reason', 'new_asset_commission', 'New Asset Commissioning', 'New equipment arriving requiring initial spares provisioning', '#a78bfa', 'Equipment & Fleet Changes', 4, 6);

-- Engineering & Technical (Indigo tones)
INSERT INTO lookup_options (category, value, label, description, color, group_name, group_order, sort_order) VALUES
('review_reason', 'engineering_change', 'Engineering Change Order (ECO)', 'Formal engineering change affecting part applicability or specification', '#6366f1', 'Engineering & Technical', 5, 1),
('review_reason', 'oem_bulletin', 'OEM Bulletin / Service Letter', 'Manufacturer advisory recommending part change or inspection', '#4f46e5', 'Engineering & Technical', 5, 2),
('review_reason', 'oem_recall', 'OEM Recall', 'Mandatory manufacturer recall requiring removal from service', '#4338ca', 'Engineering & Technical', 5, 3),
('review_reason', 'specification_change', 'Specification Change', 'Technical specification updated, current stock may not comply', '#3730a3', 'Engineering & Technical', 5, 4),
('review_reason', 'obsolescence', 'Component Obsolescence', 'Part no longer manufactured or supported by OEM', '#312e81', 'Engineering & Technical', 5, 5),
('review_reason', 'reliability_upgrade', 'Reliability Improvement / Upgrade', 'Improved alternative available, existing stock to be phased out', '#818cf8', 'Engineering & Technical', 5, 6),
('review_reason', 'standardisation', 'Standardisation Initiative', 'Consolidating to fewer part numbers across fleet or sites', '#a5b4fc', 'Engineering & Technical', 5, 7),
('review_reason', 'superseded_part', 'Superseded Part Number', 'Part number replaced by new number, stock to be consumed or converted', '#c7d2fe', 'Engineering & Technical', 5, 8);

-- Maintenance Driven (Teal/Cyan tones)
INSERT INTO lookup_options (category, value, label, description, color, group_name, group_order, sort_order) VALUES
('review_reason', 'condition_monitoring', 'Condition Monitoring Finding', 'Vibration, oil analysis, or thermography indicates impending failure', '#14b8a6', 'Maintenance Driven', 6, 1),
('review_reason', 'predictive_maintenance', 'Predictive Maintenance Alert', 'Analytics or sensor data predicting component replacement need', '#0d9488', 'Maintenance Driven', 6, 2),
('review_reason', 'shutdown_planning', 'Shutdown / Turnaround Planning', 'Major planned maintenance event requiring stock positioning', '#0f766e', 'Maintenance Driven', 6, 3),
('review_reason', 'overhaul_change', 'Overhaul Program Change', 'Change to component overhaul intervals or scope', '#115e59', 'Maintenance Driven', 6, 4),
('review_reason', 'maintenance_strategy', 'Maintenance Strategy Change', 'Shift in maintenance approach (e.g., time-based to condition-based)', '#06b6d4', 'Maintenance Driven', 6, 5),
('review_reason', 'life_extension', 'Component Life Extension', 'Extended service interval reducing anticipated consumption', '#0891b2', 'Maintenance Driven', 6, 6),
('review_reason', 'failure_analysis', 'Failure Analysis Outcome', 'Root cause analysis recommending stocking or design change', '#0e7490', 'Maintenance Driven', 6, 7);

-- Supply Chain (Pink/Rose tones)
INSERT INTO lookup_options (category, value, label, description, color, group_name, group_order, sort_order) VALUES
('review_reason', 'supplier_change', 'Supplier Change', 'New supplier requiring review of existing stock compatibility', '#ec4899', 'Supply Chain', 7, 1),
('review_reason', 'supplier_failure', 'Supplier Failure / Insolvency', 'Supplier unable to continue supply, alternative sourcing required', '#db2777', 'Supply Chain', 7, 2),
('review_reason', 'lead_time_change', 'Lead Time Change', 'Significant change in supplier delivery timeframes', '#be185d', 'Supply Chain', 7, 3),
('review_reason', 'price_change', 'Significant Price Change', 'Material cost increase/decrease affecting holding decisions', '#9d174d', 'Supply Chain', 7, 4),
('review_reason', 'moq_change', 'MOQ Change', 'Supplier minimum order quantity change affecting reorder strategy', '#f472b6', 'Supply Chain', 7, 5),
('review_reason', 'supply_shortage', 'Supply Shortage / Allocation', 'Limited market availability requiring stock conservation or alternatives', '#f9a8d4', 'Supply Chain', 7, 6),
('review_reason', 'local_content', 'Local Content Requirement', 'Regulatory requirement to source from local suppliers', '#fbcfe8', 'Supply Chain', 7, 7),
('review_reason', 'import_restriction', 'Import Restriction / Tariff Change', 'Trade policy change affecting sourcing or landed cost', '#fce7f3', 'Supply Chain', 7, 8);

-- Rotables & Repairables (Slate/Gray tones)
INSERT INTO lookup_options (category, value, label, description, color, group_name, group_order, sort_order) VALUES
('review_reason', 'rotable_rebalance', 'Rotable Pool Rebalancing', 'Adjusting serviceable rotable quantities across locations', '#64748b', 'Rotables & Repairables', 8, 1),
('review_reason', 'repair_vs_replace', 'Repair vs Replace Decision', 'Economic analysis indicates change from repair to replace or vice versa', '#475569', 'Rotables & Repairables', 8, 2),
('review_reason', 'repairable_condemned', 'Repairable Condemned', 'Repairable component deemed beyond economical repair', '#334155', 'Rotables & Repairables', 8, 3),
('review_reason', 'core_return_surplus', 'Core Return Surplus', 'Excess cores accumulated from exchange program', '#1e293b', 'Rotables & Repairables', 8, 4),
('review_reason', 'exchange_pool_adjustment', 'Exchange Pool Adjustment', 'Resizing exchange float based on demand or turn time changes', '#94a3b8', 'Rotables & Repairables', 8, 5);

-- Project & Capital (Emerald/Green tones)
INSERT INTO lookup_options (category, value, label, description, color, group_name, group_order, sort_order) VALUES
('review_reason', 'project_surplus', 'Capital Project Surplus', 'Excess materials remaining after project completion', '#10b981', 'Project & Capital', 9, 1),
('review_reason', 'project_cancellation', 'Project Cancellation', 'Project cancelled, materials no longer required for original purpose', '#059669', 'Project & Capital', 9, 2),
('review_reason', 'project_scope_change', 'Project Scope Change', 'Project requirements changed affecting material needs', '#047857', 'Project & Capital', 9, 3),
('review_reason', 'commissioning_handover', 'Commissioning Spares Handover', 'Transferring capital project spares to operational inventory', '#065f46', 'Project & Capital', 9, 4);

-- Compliance & Safety (Red tones - darker for emphasis)
INSERT INTO lookup_options (category, value, label, description, color, group_name, group_order, sort_order) VALUES
('review_reason', 'safety_critical', 'Safety Critical Review', 'Review of parts classified as safety critical for availability and condition', '#dc2626', 'Compliance & Safety', 10, 1),
('review_reason', 'regulatory_compliance', 'Regulatory Requirement', 'Compliance audit or regulatory change affecting material requirements', '#b91c1c', 'Compliance & Safety', 10, 2),
('review_reason', 'environmental_compliance', 'Environmental Compliance', 'Environmental regulation affecting material use or disposal', '#991b1b', 'Compliance & Safety', 10, 3),
('review_reason', 'insurance_requirement', 'Insurance Requirement', 'Insurer mandated spares holding or condition verification', '#7f1d1d', 'Compliance & Safety', 10, 4),
('review_reason', 'dg_reclassification', 'Dangerous Goods Reclassification', 'Hazmat classification change affecting storage or handling', '#450a0a', 'Compliance & Safety', 10, 5);

-- Operational (Orange tones)
INSERT INTO lookup_options (category, value, label, description, color, group_name, group_order, sort_order) VALUES
('review_reason', 'warehouse_consolidation', 'Warehouse Consolidation', 'Combining stock locations, reviewing duplicates and quantities', '#fb923c', 'Operational', 11, 1),
('review_reason', 'storage_constraints', 'Storage Constraints', 'Limited warehouse capacity requiring stock reduction', '#f97316', 'Operational', 11, 2),
('review_reason', 'cost_reduction', 'Cost Reduction Initiative', 'Business initiative to reduce inventory carrying costs', '#ea580c', 'Operational', 11, 3),
('review_reason', 'working_capital', 'Working Capital Optimisation', 'Finance-driven review to release capital tied up in inventory', '#c2410c', 'Operational', 11, 4),
('review_reason', 'inter_site_transfer', 'Inter-Site Transfer', 'Moving stock between sites to balance inventory', '#9a3412', 'Operational', 11, 5),
('review_reason', 'consignment_review', 'Consignment Review', 'Review of supplier-owned consignment stock arrangements', '#7c2d12', 'Operational', 11, 6);

-- Other (Gray)
INSERT INTO lookup_options (category, value, label, description, color, group_name, group_order, sort_order) VALUES
('review_reason', 'other', 'Other (Please Specify)', 'Reason not listed above', '#6b7280', 'Other', 99, 1);


-- ============================================================================
-- PROPOSED ACTION (also used for SME Recommendation and Final Decision)
-- ============================================================================

-- Retain (Green tones)
-- config: requires_sme (whether SME review is required), requires_approval (whether formal approval is required)
INSERT INTO lookup_options (category, value, label, description, color, group_name, group_order, sort_order, config) VALUES
('proposed_action', 'keep_no_change', 'Keep - No Change', 'Retain current stock levels and settings unchanged', '#22c55e', 'Retain', 1, 1, '{"requires_sme": false, "requires_approval": false}'),
('proposed_action', 'keep_adjust_levels', 'Keep - Adjust Levels', 'Retain material but modify min/max, safety stock, or reorder point', '#16a34a', 'Retain', 1, 2, '{"requires_sme": true, "requires_approval": true}'),
('proposed_action', 'keep_reclassify', 'Keep - Reclassify', 'Retain but change criticality, stock type, or material group', '#15803d', 'Retain', 1, 3, '{"requires_sme": true, "requires_approval": true}');

-- Consume & Run Down (Amber/Yellow tones)
INSERT INTO lookup_options (category, value, label, description, color, group_name, group_order, sort_order, config) VALUES
('proposed_action', 'run_down', 'Run Down - Do Not Reorder', 'Consume existing stock but do not replenish', '#eab308', 'Consume & Run Down', 2, 1, '{"requires_sme": true, "requires_approval": true}');
-- ('proposed_action', 'consume_accelerate', 'Consume - Accelerate Usage', 'Actively find opportunities to use stock before expiry or obsolescence', '#ca8a04', 'Consume & Run Down', 2, 2),
-- ('proposed_action', 'substitute', 'Substitute - Use as Alternative', 'Use as substitute for another part number where applicable', '#a16207', 'Consume & Run Down', 2, 3);

-- -- Transfer & Redeploy (Blue tones)
-- INSERT INTO lookup_options (category, value, label, description, color, group_name, group_order, sort_order) VALUES
-- ('proposed_action', 'transfer_site', 'Transfer - Inter-Site', 'Move stock to another site with higher demand', '#3b82f6', 'Transfer & Redeploy', 3, 1),
-- ('proposed_action', 'transfer_project', 'Transfer - To Project', 'Allocate stock to a capital project or shutdown', '#2563eb', 'Transfer & Redeploy', 3, 2),
-- ('proposed_action', 'transfer_consignment', 'Transfer - To Consignment', 'Move to supplier-managed consignment arrangement', '#1d4ed8', 'Transfer & Redeploy', 3, 3),
-- ('proposed_action', 'return_supplier', 'Return to Supplier', 'Return stock to supplier for credit or exchange', '#1e40af', 'Transfer & Redeploy', 3, 4);

-- -- Sell & Recover Value (Emerald tones)
-- INSERT INTO lookup_options (category, value, label, description, color, group_name, group_order, sort_order) VALUES
-- ('proposed_action', 'sell_external', 'Sell - External Sale', 'Sell to third party, broker, or surplus dealer', '#10b981', 'Sell & Recover Value', 4, 1),
-- ('proposed_action', 'sell_intercompany', 'Sell - Intercompany', 'Sell to affiliated company or joint venture partner', '#059669', 'Sell & Recover Value', 4, 2),
-- ('proposed_action', 'auction', 'Auction', 'Dispose via auction platform', '#047857', 'Sell & Recover Value', 4, 3);

-- -- Repair & Refurbish (Cyan tones)
-- INSERT INTO lookup_options (category, value, label, description, color, group_name, group_order, sort_order) VALUES
-- ('proposed_action', 'repair', 'Repair - Return to Service', 'Repair damaged or failed item to serviceable condition', '#06b6d4', 'Repair & Refurbish', 5, 1),
-- ('proposed_action', 'refurbish', 'Refurbish / Recondition', 'Overhaul or recondition to extend useful life', '#0891b2', 'Repair & Refurbish', 5, 2),
-- ('proposed_action', 'recertify', 'Re-certify / Re-test', 'Test or inspect to verify condition and extend shelf life', '#0e7490', 'Repair & Refurbish', 5, 3),
-- ('proposed_action', 'rework', 'Rework - Modify to Spec', 'Modify to meet current specification or new application', '#155e75', 'Repair & Refurbish', 5, 4);

-- -- Rotables & Repairables (Slate tones)
-- INSERT INTO lookup_options (category, value, label, description, color, group_name, group_order, sort_order) VALUES
-- ('proposed_action', 'return_rotable_pool', 'Return to Rotable Pool', 'Return serviceable rotable to exchange pool', '#64748b', 'Rotables & Repairables', 6, 1),
-- ('proposed_action', 'condemn_ber', 'Condemn - BER', 'Condemn repairable as Beyond Economical Repair', '#475569', 'Rotables & Repairables', 6, 2),
-- ('proposed_action', 'scrap_core', 'Scrap Core', 'Dispose of unserviceable core with no repair or exchange value', '#334155', 'Rotables & Repairables', 6, 3),
-- ('proposed_action', 'return_core', 'Return Core to Supplier', 'Return core to OEM or repair vendor for credit', '#1e293b', 'Rotables & Repairables', 6, 4);

-- -- Write-Off & Dispose (Red tones)
-- INSERT INTO lookup_options (category, value, label, description, color, group_name, group_order, sort_order) VALUES
-- ('proposed_action', 'write_off_scrap', 'Write Off - Scrap', 'Write off value and dispose as scrap', '#ef4444', 'Write-Off & Dispose', 7, 1),
-- ('proposed_action', 'write_off_controlled', 'Write Off - Controlled Disposal', 'Write off and dispose via controlled method (hazmat, confidential)', '#dc2626', 'Write-Off & Dispose', 7, 2),
-- ('proposed_action', 'write_off_landfill', 'Write Off - Landfill', 'Write off and dispose to landfill', '#b91c1c', 'Write-Off & Dispose', 7, 3),
-- ('proposed_action', 'write_off_recycle', 'Write Off - Recycle', 'Write off and dispose via recycling (metal recovery, etc.)', '#991b1b', 'Write-Off & Dispose', 7, 4),
-- ('proposed_action', 'donate', 'Donate', 'Donate to training institution, community, or charity', '#f87171', 'Write-Off & Dispose', 7, 5);

-- -- Data & Master Record (Purple tones)
-- INSERT INTO lookup_options (category, value, label, description, color, group_name, group_order, sort_order) VALUES
-- ('proposed_action', 'supersede', 'Supersede - Link to New PN', 'Mark as superseded and link to replacement part number', '#8b5cf6', 'Data & Master Record', 8, 1),
-- ('proposed_action', 'obsolete', 'Obsolete - Mark Inactive', 'Flag material master as obsolete, block future purchasing', '#7c3aed', 'Data & Master Record', 8, 2),
-- ('proposed_action', 'merge', 'Merge - Consolidate Part Numbers', 'Consolidate duplicate or similar part numbers', '#6d28d9', 'Data & Master Record', 8, 3);


-- ============================================================================
-- SME TYPE (Department/Discipline for SME Review)
-- ============================================================================

-- Engineering (Blue tones)
INSERT INTO lookup_options (category, value, label, description, color, group_name, group_order, sort_order) VALUES
('sme_type', 'sme_mechanical', 'Mechanical Engineering', 'Rotating equipment, structural, hydraulics, pneumatics', '#3b82f6', 'Engineering', 1, 1),
('sme_type', 'sme_electrical', 'Electrical Engineering', 'Electrical systems, power distribution, lighting', '#2563eb', 'Engineering', 1, 2),
('sme_type', 'sme_control_systems', 'Control Systems / Automation', 'PLC, SCADA, instrumentation, sensors', '#1d4ed8', 'Engineering', 1, 3),
('sme_type', 'sme_reliability', 'Reliability Engineering', 'RCM, failure analysis, criticality assessment', '#1e40af', 'Engineering', 1, 4);

-- Maintenance (Orange tones)
INSERT INTO lookup_options (category, value, label, description, color, group_name, group_order, sort_order) VALUES
('sme_type', 'sme_maintenance_planning', 'Maintenance Planning', 'Work order history, PM requirements, shutdown scope', '#f97316', 'Maintenance', 2, 1),
('sme_type', 'sme_asset_management', 'Asset Management', 'Asset lifecycle, fleet strategy, capital planning', '#ea580c', 'Maintenance', 2, 2),
('sme_type', 'sme_workshop', 'Workshop / Repairs', 'Rotable management, repair vs replace, BER assessment', '#c2410c', 'Maintenance', 2, 3);

-- Operations (Green tones)
INSERT INTO lookup_options (category, value, label, description, color, group_name, group_order, sort_order) VALUES
('sme_type', 'sme_operations', 'Production / Operations', 'Operational impact, criticality to production', '#22c55e', 'Operations', 3, 1),
('sme_type', 'sme_safety', 'Safety / HSE', 'Safety critical items, hazmat, environmental compliance', '#16a34a', 'Operations', 3, 2);

-- Commercial (Purple tones)
INSERT INTO lookup_options (category, value, label, description, color, group_name, group_order, sort_order) VALUES
('sme_type', 'sme_procurement', 'Procurement / Supply Chain', 'Supplier relationships, lead times, commercial terms', '#8b5cf6', 'Commercial', 4, 1),
('sme_type', 'sme_finance', 'Finance', 'Write-off approval, value recovery, insurance', '#7c3aed', 'Commercial', 4, 2),
('sme_type', 'sme_contracts', 'Contracts', 'OEM agreements, service contracts, warranty', '#6d28d9', 'Commercial', 4, 3);


-- ============================================================================
-- FEEDBACK METHOD (How SME feedback was collected)
-- ============================================================================

INSERT INTO lookup_options (category, value, label, description, color, group_name, group_order, sort_order) VALUES
('feedback_method', 'email', 'Email', 'Feedback received via email correspondence', '#3b82f6', NULL, 1, 1),
('feedback_method', 'meeting', 'Meeting', 'Feedback received during formal meeting', '#8b5cf6', NULL, 1, 2),
('feedback_method', 'phone_call', 'Phone Call', 'Feedback received via phone conversation', '#22c55e', NULL, 1, 3),
('feedback_method', 'teams_chat', 'Teams / Chat', 'Feedback received via instant messaging', '#06b6d4', NULL, 1, 4),
('feedback_method', 'in_person', 'In Person', 'Feedback received face-to-face on site', '#f97316', NULL, 1, 5),
('feedback_method', 'system_comment', 'System Comment', 'Feedback provided directly in this system', '#64748b', NULL, 1, 6),
('feedback_method', 'other', 'Other', 'Other method of communication', '#6b7280', NULL, 1, 7);


-- ============================================================================
-- STOCK TYPE (Type of inventory being adjusted)
-- ============================================================================

INSERT INTO lookup_options (category, value, label, description, color, group_name, group_order, sort_order) VALUES
('stock_type', 'safety_stock', 'Safety Stock', 'Minimum buffer stock held to prevent stockouts', '#ef4444', NULL, 1, 1),
('stock_type', 'unrestricted', 'Unrestricted Stock', 'Available stock for immediate use', '#22c55e', NULL, 1, 2),
('stock_type', 'quality_inspection', 'Quality Inspection Stock', 'Stock pending quality inspection before release', '#eab308', NULL, 1, 3),
('stock_type', 'blocked', 'Blocked Stock', 'Stock blocked from use due to quality or other issues', '#dc2626', NULL, 1, 4),
('stock_type', 'in_transit', 'In Transit', 'Stock in transit between locations', '#3b82f6', NULL, 1, 5),
('stock_type', 'consignment', 'Consignment Stock', 'Supplier-owned stock held on site', '#8b5cf6', NULL, 1, 6),
('stock_type', 'project_stock', 'Project Stock', 'Stock reserved for specific capital project', '#f97316', NULL, 1, 7),
('stock_type', 'rotable_serviceable', 'Rotable - Serviceable', 'Serviceable rotable ready for installation', '#10b981', NULL, 1, 8),
('stock_type', 'rotable_unserviceable', 'Rotable - Unserviceable', 'Unserviceable rotable awaiting repair', '#f59e0b', NULL, 1, 9),
('stock_type', 'core', 'Core / Exchange', 'Core unit for exchange or rebuild program', '#64748b', NULL, 1, 10);


-- ============================================================================
-- WRITE-OFF REASON (Specific reason for write-off actions)
-- ============================================================================

INSERT INTO lookup_options (category, value, label, description, color, group_name, group_order, sort_order) VALUES
('write_off_reason', 'obsolete', 'Obsolete', 'No longer applicable to current equipment', '#8b5cf6', NULL, 1, 1),
('write_off_reason', 'damaged', 'Damaged', 'Physical damage beyond economical repair', '#ef4444', NULL, 1, 2),
('write_off_reason', 'expired', 'Expired', 'Past shelf life or certification expiry', '#f97316', NULL, 1, 3),
('write_off_reason', 'quality_reject', 'Quality Reject', 'Failed quality inspection', '#dc2626', NULL, 1, 4),
('write_off_reason', 'surplus', 'Surplus', 'Excess to foreseeable requirements', '#eab308', NULL, 1, 5),
('write_off_reason', 'superseded', 'Superseded', 'Replaced by new part number', '#6366f1', NULL, 1, 6),
('write_off_reason', 'contaminated', 'Contaminated', 'Contamination rendering unusable', '#b91c1c', NULL, 1, 7),
('write_off_reason', 'ber', 'Beyond Economical Repair', 'Repair cost exceeds replacement value', '#991b1b', NULL, 1, 8),
('write_off_reason', 'other', 'Other', 'Other reason for write-off', '#6b7280', NULL, 1, 9);


-- ============================================================================
-- MATERIAL CRITICALITY (For reclassification actions)
-- ============================================================================

INSERT INTO lookup_options (category, value, label, description, color, group_name, group_order, sort_order) VALUES
('material_criticality', 'critical', 'Critical', 'Failure causes immediate safety risk or production stop', '#dc2626', NULL, 1, 1),
('material_criticality', 'essential', 'Essential', 'Failure causes significant production impact within 24-48 hours', '#f97316', NULL, 1, 2),
('material_criticality', 'important', 'Important', 'Failure causes moderate operational impact', '#eab308', NULL, 1, 3),
('material_criticality', 'standard', 'Standard', 'Failure causes minor impact, alternatives available', '#3b82f6', NULL, 1, 4),
('material_criticality', 'non_critical', 'Non-Critical', 'No significant operational impact', '#22c55e', NULL, 1, 5);


-- ============================================================================
-- DISPOSAL METHOD (For write-off and dispose actions)
-- ============================================================================

INSERT INTO lookup_options (category, value, label, description, color, group_name, group_order, sort_order) VALUES
('disposal_method', 'scrap_metal', 'Scrap Metal Recycling', 'Dispose via scrap metal dealer for recovery', '#64748b', NULL, 1, 1),
('disposal_method', 'ewaste', 'E-Waste Recycling', 'Dispose via certified e-waste recycler', '#06b6d4', NULL, 1, 2),
('disposal_method', 'hazmat', 'Hazmat Disposal', 'Dispose via licensed hazardous waste contractor', '#dc2626', NULL, 1, 3),
('disposal_method', 'landfill', 'Landfill', 'Dispose to approved landfill site', '#78716c', NULL, 1, 4),
('disposal_method', 'incineration', 'Incineration', 'Dispose via controlled incineration', '#f97316', NULL, 1, 5),
('disposal_method', 'crushing', 'Crushing / Destruction', 'Physical destruction to prevent reuse', '#ef4444', NULL, 1, 6),
('disposal_method', 'auction', 'Auction / Sale', 'Sell via auction or surplus dealer', '#22c55e', NULL, 1, 7),
('disposal_method', 'donation', 'Donation', 'Donate to approved organisation', '#8b5cf6', NULL, 1, 8),
('disposal_method', 'return_vendor', 'Return to Vendor', 'Return to supplier for credit or disposal', '#3b82f6', NULL, 1, 9);


-- ============================================================================
-- FOLLOW-UP TRIGGER (Reason for scheduling follow-up review)
-- ============================================================================

INSERT INTO lookup_options (category, value, label, description, color, group_name, group_order, sort_order) VALUES
('follow_up_trigger', 'monitor_consumption', 'Monitor Consumption', 'Track usage to validate stocking decision', '#3b82f6', NULL, 1, 1),
('follow_up_trigger', 'pending_disposal', 'Pending Disposal', 'Disposal action in progress, confirm completion', '#ef4444', NULL, 1, 2),
('follow_up_trigger', 'pending_transfer', 'Pending Transfer', 'Transfer action in progress, confirm completion', '#8b5cf6', NULL, 1, 3),
('follow_up_trigger', 'price_review', 'Price Review', 'Review after expected price change', '#22c55e', NULL, 1, 4),
('follow_up_trigger', 'shelf_life', 'Shelf Life Check', 'Review before shelf life expiry', '#f97316', NULL, 1, 5),
('follow_up_trigger', 'project_completion', 'Project Completion', 'Review after related project completes', '#06b6d4', NULL, 1, 6),
('follow_up_trigger', 'supplier_update', 'Supplier Update', 'Review after expected supplier change', '#ec4899', NULL, 1, 7),
('follow_up_trigger', 'engineering_change', 'Engineering Change', 'Review after ECO implementation', '#6366f1', NULL, 1, 8),
('follow_up_trigger', 'seasonal', 'Seasonal Review', 'Regular seasonal demand review', '#eab308', NULL, 1, 9),
('follow_up_trigger', 'other', 'Other', 'Other reason for follow-up', '#6b7280', NULL, 1, 10);
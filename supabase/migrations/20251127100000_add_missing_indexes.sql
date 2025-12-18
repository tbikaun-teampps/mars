-- Add missing indexes for performance optimization
-- This migration adds indexes identified as missing from the schema review

-- ============ HIGH PRIORITY INDEXES ============

-- review_checklist: FK lookup when loading reviews
CREATE INDEX idx_review_checklist_review_id ON review_checklist(review_id);

-- review_attachments: FK lookup when fetching attachments for a review
CREATE INDEX idx_review_attachments_review_id ON review_attachments(review_id);

-- review_comments: FK lookup when fetching comments for a review
CREATE INDEX idx_review_comments_review_id ON review_comments(review_id);

-- review_comments: Filtering/joining comments by user
CREATE INDEX idx_review_comments_user_id ON review_comments(user_id);

-- audit_logs: Filtering audit history by user
CREATE INDEX idx_audit_logs_changed_by ON audit_logs(changed_by);

-- review_schedules: FK lookup when finding schedules for a material
CREATE INDEX idx_review_schedules_material_number ON review_schedules(material_number);

-- material_insights: Filtering insights by type
CREATE INDEX idx_material_insights_type ON material_insights(insight_type);


-- ============ MEDIUM PRIORITY INDEXES ============

-- sap_material_data: Filtering by material group in reports/dashboards
CREATE INDEX idx_sap_material_mat_group ON sap_material_data(mat_group);

-- material_reviews: Finding reviews a user created
CREATE INDEX idx_material_reviews_created_by ON material_reviews(created_by);

-- review_attachments: Finding attachments by uploader
CREATE INDEX idx_review_attachments_uploaded_by ON review_attachments(uploaded_by);

-- review_schedules: Finding schedules assigned to a reviewer
CREATE INDEX idx_review_schedules_default_reviewer ON review_schedules(default_reviewer);


-- ============ CLEANUP: Remove redundant index ============
-- idx_audit_logs_table_name is redundant since idx_audit_logs_table_record
-- on (table_name, record_id) already covers queries filtering by table_name alone
DROP INDEX IF EXISTS idx_audit_logs_table_name;

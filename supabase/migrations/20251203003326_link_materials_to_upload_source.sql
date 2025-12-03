-- Link materials to their upload source

ALTER TABLE sap_material_data ADD COLUMN last_upload_job_id UUID REFERENCES upload_jobs(job_id);
ALTER TABLE sap_material_data ADD COLUMN first_uploaded_at timestamptz;
ALTER TABLE sap_material_data ADD COLUMN last_modified_at timestamptz DEFAULT NOW();
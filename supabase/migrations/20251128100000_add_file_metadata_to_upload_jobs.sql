-- Add file metadata columns to upload_jobs table
-- This allows tracking the original file name, size, and type for upload history

ALTER TABLE upload_jobs
  ADD COLUMN file_name VARCHAR(255),
  ADD COLUMN file_size_bytes BIGINT,
  ADD COLUMN file_mime_type VARCHAR(100);

-- Add comment for documentation
COMMENT ON COLUMN upload_jobs.file_name IS 'Original filename of the uploaded CSV';
COMMENT ON COLUMN upload_jobs.file_size_bytes IS 'File size in bytes';
COMMENT ON COLUMN upload_jobs.file_mime_type IS 'MIME type of the uploaded file';

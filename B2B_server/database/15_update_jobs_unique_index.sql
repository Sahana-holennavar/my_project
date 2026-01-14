-- ========================================
-- Migration: Update Jobs Table Unique Index
-- Date: 2025-11-24
-- Purpose: Allow same job titles with different locations, experience levels, employment types, and job modes
-- ========================================

-- Drop the old strict unique index
DROP INDEX IF EXISTS "b2b_dev".idx_jobs_title_company_unique;

-- Create new unique index that includes location, experience_level, employment_type, and job_mode
-- This allows duplicate titles only if ANY of these fields differ
CREATE UNIQUE INDEX idx_jobs_title_company_unique ON "b2b_dev".Jobs(
    LOWER(title), 
    company_id, 
    location, 
    experience_level, 
    employment_type, 
    job_mode
);

-- For production schema as well
DROP INDEX IF EXISTS "b2b".idx_jobs_title_company_unique;

CREATE UNIQUE INDEX idx_jobs_title_company_unique ON "b2b".Jobs(
    LOWER(title), 
    company_id, 
    location, 
    experience_level, 
    employment_type, 
    job_mode
);

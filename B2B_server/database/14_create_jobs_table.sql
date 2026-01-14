-- ========================================
-- Create Jobs Table
-- Schema: b2b_dev (Development) and b2b (Production)
-- Purpose: Create Jobs table for job postings by business profiles
-- ========================================

-- For Development Schema (b2b_dev)
CREATE TABLE IF NOT EXISTS "b2b_dev".Jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    job_description TEXT NOT NULL,
    employment_type TEXT NOT NULL CHECK (employment_type IN ('full_time', 'part_time')),
    skills JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'closed')),
    job_mode TEXT CHECK (job_mode IN ('onsite', 'remote', 'hybrid')),
    location JSONB DEFAULT '{}'::jsonb,
    experience_level JSONB DEFAULT '{}'::jsonb,
    company_id UUID NOT NULL,
    created_by_id UUID NOT NULL,
    CONSTRAINT fk_job_company FOREIGN KEY (company_id) REFERENCES "b2b_dev".company_pages(id) ON DELETE CASCADE,
    CONSTRAINT fk_job_created_by FOREIGN KEY (created_by_id) REFERENCES "b2b_dev".users(id) ON DELETE RESTRICT
);

-- Create index on company_id for faster queries
CREATE INDEX IF NOT EXISTS idx_jobs_company_id ON "b2b_dev".Jobs(company_id);

-- Create index on created_by_id for faster queries
CREATE INDEX IF NOT EXISTS idx_jobs_created_by_id ON "b2b_dev".Jobs(created_by_id);

-- Create unique index on title, company_id, location, experience_level, employment_type, and job_mode
-- This allows same job title in different locations/experience levels/types/modes
CREATE UNIQUE INDEX IF NOT EXISTS idx_jobs_title_company_unique ON "b2b_dev".Jobs(
    LOWER(title), 
    company_id, 
    location, 
    experience_level, 
    employment_type, 
    job_mode
);

-- Create index on status for filtering
CREATE INDEX IF NOT EXISTS idx_jobs_status ON "b2b_dev".Jobs(status);

-- Add comments for documentation
COMMENT ON TABLE "b2b_dev".Jobs IS 'Stores job postings created by business profiles';
COMMENT ON COLUMN "b2b_dev".Jobs.title IS 'Job title (case-insensitive unique per company)';
COMMENT ON COLUMN "b2b_dev".Jobs.job_description IS 'Full job description';
COMMENT ON COLUMN "b2b_dev".Jobs.employment_type IS 'Type of employment: full_time or part_time';
COMMENT ON COLUMN "b2b_dev".Jobs.skills IS 'Array of required skills in JSONB format';
COMMENT ON COLUMN "b2b_dev".Jobs.status IS 'Job status: active, inactive, or closed';
COMMENT ON COLUMN "b2b_dev".Jobs.job_mode IS 'Work mode: onsite, remote, or hybrid';
COMMENT ON COLUMN "b2b_dev".Jobs.location IS 'Location details in JSONB format: {city, state, country}';
COMMENT ON COLUMN "b2b_dev".Jobs.experience_level IS 'Experience requirements in JSONB format: {min, max} or array';
COMMENT ON COLUMN "b2b_dev".Jobs.company_id IS 'Foreign key to company_pages.id';
COMMENT ON COLUMN "b2b_dev".Jobs.created_by_id IS 'Foreign key to users.id (user who created the job)';

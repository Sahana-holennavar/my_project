-- ========================================
-- Add Search Indexes to Jobs Table
-- Schema: b2b_dev (Development) and b2b (Production)
-- Purpose: Add indexes for optimized job search functionality
-- ========================================

-- Install pg_trgm extension for text search if not exists
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- For Development Schema (b2b_dev)

-- Create index on title for text search (case-insensitive prefix/partial match)
CREATE INDEX IF NOT EXISTS idx_jobs_title_trgm ON "b2b_dev".Jobs USING GIN (title gin_trgm_ops);

-- Create index on employment_type for exact matches
CREATE INDEX IF NOT EXISTS idx_jobs_employment_type ON "b2b_dev".Jobs(employment_type);

-- Create index on job_mode for exact matches
CREATE INDEX IF NOT EXISTS idx_jobs_job_mode ON "b2b_dev".Jobs(job_mode);

-- Create GIN index on location JSONB for JSONB contains operations
CREATE INDEX IF NOT EXISTS idx_jobs_location_gin ON "b2b_dev".Jobs USING GIN (location);

-- Create GIN index on skills JSONB array for array operations
CREATE INDEX IF NOT EXISTS idx_jobs_skills_gin ON "b2b_dev".Jobs USING GIN (skills);

-- Create GIN index on experience_level JSONB for range queries
CREATE INDEX IF NOT EXISTS idx_jobs_experience_level_gin ON "b2b_dev".Jobs USING GIN (experience_level);

-- Create composite index on status and created_at for common filtered queries
CREATE INDEX IF NOT EXISTS idx_jobs_status_created_at ON "b2b_dev".Jobs(status, created_at DESC);

-- For Production Schema (b2b)

-- Create index on title for text search (case-insensitive prefix/partial match)
CREATE INDEX IF NOT EXISTS idx_jobs_title_trgm ON "b2b".Jobs USING GIN (title gin_trgm_ops);

-- Create index on employment_type for exact matches
CREATE INDEX IF NOT EXISTS idx_jobs_employment_type ON "b2b".Jobs(employment_type);

-- Create index on job_mode for exact matches
CREATE INDEX IF NOT EXISTS idx_jobs_job_mode ON "b2b".Jobs(job_mode);

-- Create GIN index on location JSONB for JSONB contains operations
CREATE INDEX IF NOT EXISTS idx_jobs_location_gin ON "b2b".Jobs USING GIN (location);

-- Create GIN index on skills JSONB array for array operations
CREATE INDEX IF NOT EXISTS idx_jobs_skills_gin ON "b2b".Jobs USING GIN (skills);

-- Create GIN index on experience_level JSONB for range queries
CREATE INDEX IF NOT EXISTS idx_jobs_experience_level_gin ON "b2b".Jobs USING GIN (experience_level);

-- Create composite index on status and created_at for common filtered queries
CREATE INDEX IF NOT EXISTS idx_jobs_status_created_at ON "b2b".Jobs(status, created_at DESC);

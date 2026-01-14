-- ========================================
-- Create Resume Grading Table
-- Schema: b2b_dev (Development) and b2b (Production)
-- Purpose: Store resume grading data from the resume evaluator module
-- ========================================

-- For Development Schema (b2b_dev)
CREATE TABLE IF NOT EXISTS "b2b_dev".resume_grading (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    job_id UUID NULL,
    job_title VARCHAR(255) NOT NULL,
    job_description TEXT NOT NULL,
    resume_json JSONB NOT NULL,
    ats_score INTEGER NOT NULL CHECK (ats_score >= 0 AND ats_score <= 100),
    keyword_score INTEGER NOT NULL CHECK (keyword_score >= 0 AND keyword_score <= 100),
    format_score INTEGER NOT NULL CHECK (format_score >= 0 AND format_score <= 100),
    overall_score INTEGER NOT NULL CHECK (overall_score >= 0 AND overall_score <= 100),
    suggestions JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_resume_grading_user FOREIGN KEY (user_id) REFERENCES "b2b_dev".users(id) ON DELETE CASCADE,
    CONSTRAINT fk_resume_grading_job FOREIGN KEY (job_id) REFERENCES "b2b_dev".Jobs(id) ON DELETE SET NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_resume_grading_user_id ON "b2b_dev".resume_grading(user_id);
CREATE INDEX IF NOT EXISTS idx_resume_grading_job_title ON "b2b_dev".resume_grading(job_title);
CREATE INDEX IF NOT EXISTS idx_resume_grading_job_id ON "b2b_dev".resume_grading(job_id);
CREATE INDEX IF NOT EXISTS idx_resume_grading_overall_score ON "b2b_dev".resume_grading(overall_score);
CREATE INDEX IF NOT EXISTS idx_resume_grading_created_at ON "b2b_dev".resume_grading(created_at);

-- Create composite index for common query patterns (user + score filtering)
CREATE INDEX IF NOT EXISTS idx_resume_grading_user_score ON "b2b_dev".resume_grading(user_id, overall_score DESC);

-- Create trigger function to update updated_at timestamp (if not exists)
CREATE OR REPLACE FUNCTION "b2b_dev".update_resume_grading_modtime()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_resume_grading_modtime ON "b2b_dev".resume_grading;
CREATE TRIGGER update_resume_grading_modtime
    BEFORE UPDATE ON "b2b_dev".resume_grading
    FOR EACH ROW
    EXECUTE FUNCTION "b2b_dev".update_resume_grading_modtime();

-- Add comments for documentation
COMMENT ON TABLE "b2b_dev".resume_grading IS 'Stores resume grading data from the resume evaluator module';
COMMENT ON COLUMN "b2b_dev".resume_grading.id IS 'Unique identifier for each resume grading record';
COMMENT ON COLUMN "b2b_dev".resume_grading.user_id IS 'Foreign key to users.id - the user whose resume was graded';
COMMENT ON COLUMN "b2b_dev".resume_grading.job_id IS 'Optional foreign key to Jobs.id - links to specific job posting if applicable';
COMMENT ON COLUMN "b2b_dev".resume_grading.job_title IS 'Job title used for grading (indexed for efficient querying)';
COMMENT ON COLUMN "b2b_dev".resume_grading.job_description IS 'Full job description used for grading';
COMMENT ON COLUMN "b2b_dev".resume_grading.resume_json IS 'Structured JSONB containing all extracted information from the resume';
COMMENT ON COLUMN "b2b_dev".resume_grading.ats_score IS 'ATS (Applicant Tracking System) compatibility score (0-100)';
COMMENT ON COLUMN "b2b_dev".resume_grading.keyword_score IS 'Keyword match score based on job description (0-100)';
COMMENT ON COLUMN "b2b_dev".resume_grading.format_score IS 'Resume format and structure score (0-100)';
COMMENT ON COLUMN "b2b_dev".resume_grading.overall_score IS 'Overall resume quality score (0-100, indexed for filtering)';
COMMENT ON COLUMN "b2b_dev".resume_grading.suggestions IS 'JSONB array of optimization suggestions for improving the resume';
COMMENT ON COLUMN "b2b_dev".resume_grading.created_at IS 'Timestamp when the grading record was created';
COMMENT ON COLUMN "b2b_dev".resume_grading.updated_at IS 'Timestamp when the grading record was last updated (auto-updated by trigger)';

-- ========================================
-- For Production Schema (b2b)
-- ========================================

CREATE TABLE IF NOT EXISTS "b2b".resume_grading (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    job_id UUID NULL,
    job_title VARCHAR(255) NOT NULL,
    job_description TEXT NOT NULL,
    resume_json JSONB NOT NULL,
    ats_score INTEGER NOT NULL CHECK (ats_score >= 0 AND ats_score <= 100),
    keyword_score INTEGER NOT NULL CHECK (keyword_score >= 0 AND keyword_score <= 100),
    format_score INTEGER NOT NULL CHECK (format_score >= 0 AND format_score <= 100),
    overall_score INTEGER NOT NULL CHECK (overall_score >= 0 AND overall_score <= 100),
    suggestions JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_resume_grading_user FOREIGN KEY (user_id) REFERENCES "b2b".users(id) ON DELETE CASCADE,
    CONSTRAINT fk_resume_grading_job FOREIGN KEY (job_id) REFERENCES "b2b".Jobs(id) ON DELETE SET NULL
);

-- Create indexes for production schema
CREATE INDEX IF NOT EXISTS idx_resume_grading_user_id ON "b2b".resume_grading(user_id);
CREATE INDEX IF NOT EXISTS idx_resume_grading_job_title ON "b2b".resume_grading(job_title);
CREATE INDEX IF NOT EXISTS idx_resume_grading_job_id ON "b2b".resume_grading(job_id);
CREATE INDEX IF NOT EXISTS idx_resume_grading_overall_score ON "b2b".resume_grading(overall_score);
CREATE INDEX IF NOT EXISTS idx_resume_grading_created_at ON "b2b".resume_grading(created_at);

-- Create composite index for common query patterns (user + score filtering)
CREATE INDEX IF NOT EXISTS idx_resume_grading_user_score ON "b2b".resume_grading(user_id, overall_score DESC);

-- Create trigger function to update updated_at timestamp (if not exists)
CREATE OR REPLACE FUNCTION "b2b".update_resume_grading_modtime()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_resume_grading_modtime ON "b2b".resume_grading;
CREATE TRIGGER update_resume_grading_modtime
    BEFORE UPDATE ON "b2b".resume_grading
    FOR EACH ROW
    EXECUTE FUNCTION "b2b".update_resume_grading_modtime();

-- Add comments for production schema
COMMENT ON TABLE "b2b".resume_grading IS 'Stores resume grading data from the resume evaluator module';
COMMENT ON COLUMN "b2b".resume_grading.id IS 'Unique identifier for each resume grading record';
COMMENT ON COLUMN "b2b".resume_grading.user_id IS 'Foreign key to users.id - the user whose resume was graded';
COMMENT ON COLUMN "b2b".resume_grading.job_id IS 'Optional foreign key to Jobs.id - links to specific job posting if applicable';
COMMENT ON COLUMN "b2b".resume_grading.job_title IS 'Job title used for grading (indexed for efficient querying)';
COMMENT ON COLUMN "b2b".resume_grading.job_description IS 'Full job description used for grading';
COMMENT ON COLUMN "b2b".resume_grading.resume_json IS 'Structured JSONB containing all extracted information from the resume';
COMMENT ON COLUMN "b2b".resume_grading.ats_score IS 'ATS (Applicant Tracking System) compatibility score (0-100)';
COMMENT ON COLUMN "b2b".resume_grading.keyword_score IS 'Keyword match score based on job description (0-100)';
COMMENT ON COLUMN "b2b".resume_grading.format_score IS 'Resume format and structure score (0-100)';
COMMENT ON COLUMN "b2b".resume_grading.overall_score IS 'Overall resume quality score (0-100, indexed for filtering)';
COMMENT ON COLUMN "b2b".resume_grading.suggestions IS 'JSONB array of optimization suggestions for improving the resume';
COMMENT ON COLUMN "b2b".resume_grading.created_at IS 'Timestamp when the grading record was created';
COMMENT ON COLUMN "b2b".resume_grading.updated_at IS 'Timestamp when the grading record was last updated (auto-updated by trigger)';

-- ========================================
-- Security Notes:
-- ========================================
-- 1. Encryption at rest: Ensure PostgreSQL encryption is enabled at the database/OS level
-- 2. RBAC: Grant appropriate permissions to database roles:
--    - Application role: SELECT, INSERT, UPDATE on resume_grading table
--    - Admin role: Full access
--    - Read-only role: SELECT only
-- 3. Row-level security: Consider implementing RLS policies if multi-tenant access is needed
-- 4. Sensitive data: resume_json and job_description contain sensitive information
--    - Ensure application-level encryption for sensitive fields if required
--    - Implement proper access controls in the application layer
--
-- Example RBAC grants (run as superuser):
-- GRANT SELECT, INSERT, UPDATE ON "b2b_dev".resume_grading TO application_role;
-- GRANT SELECT ON "b2b_dev".resume_grading TO readonly_role;
-- GRANT ALL ON "b2b_dev".resume_grading TO admin_role;
-- ========================================


-- ========================================
-- Create Job Applications Table
-- Schema: b2b_dev (Development) and b2b (Production)
-- Purpose: Store job applications submitted by users
-- ========================================

-- For Development Schema (b2b_dev)
CREATE TABLE IF NOT EXISTS "b2b_dev".job_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL,
    user_id UUID NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    resume JSONB NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(255) NOT NULL,
    address VARCHAR(500) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'applied' CHECK (status IN ('applied', 'selected', 'rejected')),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMP NULL,
    reviewed_by UUID NULL,
    CONSTRAINT fk_job_application_job FOREIGN KEY (job_id) REFERENCES "b2b_dev".Jobs(id) ON DELETE CASCADE,
    CONSTRAINT fk_job_application_user FOREIGN KEY (user_id) REFERENCES "b2b_dev".users(id) ON DELETE CASCADE,
    CONSTRAINT fk_job_application_reviewed_by FOREIGN KEY (reviewed_by) REFERENCES "b2b_dev".users(id) ON DELETE SET NULL,
    CONSTRAINT uk_job_application_user_job UNIQUE (job_id, user_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_job_applications_job_id ON "b2b_dev".job_applications(job_id);
CREATE INDEX IF NOT EXISTS idx_job_applications_user_id ON "b2b_dev".job_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_job_applications_status ON "b2b_dev".job_applications(status);
CREATE INDEX IF NOT EXISTS idx_job_applications_created_at ON "b2b_dev".job_applications(created_at);

-- Add comments for documentation
COMMENT ON TABLE "b2b_dev".job_applications IS 'Stores job applications submitted by users';
COMMENT ON COLUMN "b2b_dev".job_applications.job_id IS 'Foreign key to Jobs.id';
COMMENT ON COLUMN "b2b_dev".job_applications.user_id IS 'Foreign key to users.id (applicant)';
COMMENT ON COLUMN "b2b_dev".job_applications.resume IS 'Resume file details in JSONB format: {file_name, file_url}';
COMMENT ON COLUMN "b2b_dev".job_applications.status IS 'Application status: applied, selected, or rejected';
COMMENT ON COLUMN "b2b_dev".job_applications.reviewed_by IS 'Foreign key to users.id (admin who reviewed the application)';

-- For Production Schema (b2b) - if needed
CREATE TABLE IF NOT EXISTS "b2b".job_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL,
    user_id UUID NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    resume JSONB NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(255) NOT NULL,
    address VARCHAR(500) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'applied' CHECK (status IN ('applied', 'selected', 'rejected')),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMP NULL,
    reviewed_by UUID NULL,
    CONSTRAINT fk_job_application_job FOREIGN KEY (job_id) REFERENCES "b2b".Jobs(id) ON DELETE CASCADE,
    CONSTRAINT fk_job_application_user FOREIGN KEY (user_id) REFERENCES "b2b".users(id) ON DELETE CASCADE,
    CONSTRAINT fk_job_application_reviewed_by FOREIGN KEY (reviewed_by) REFERENCES "b2b".users(id) ON DELETE SET NULL,
    CONSTRAINT uk_job_application_user_job UNIQUE (job_id, user_id)
);

-- Create indexes for production schema
CREATE INDEX IF NOT EXISTS idx_job_applications_job_id ON "b2b".job_applications(job_id);
CREATE INDEX IF NOT EXISTS idx_job_applications_user_id ON "b2b".job_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_job_applications_status ON "b2b".job_applications(status);
CREATE INDEX IF NOT EXISTS idx_job_applications_created_at ON "b2b".job_applications(created_at);

-- Add comments for production schema
COMMENT ON TABLE "b2b".job_applications IS 'Stores job applications submitted by users';
COMMENT ON COLUMN "b2b".job_applications.job_id IS 'Foreign key to Jobs.id';
COMMENT ON COLUMN "b2b".job_applications.user_id IS 'Foreign key to users.id (applicant)';
COMMENT ON COLUMN "b2b".job_applications.resume IS 'Resume file details in JSONB format: {file_name, file_url}';
COMMENT ON COLUMN "b2b".job_applications.status IS 'Application status: applied, selected, or rejected';
COMMENT ON COLUMN "b2b".job_applications.reviewed_by IS 'Foreign key to users.id (admin who reviewed the application)';


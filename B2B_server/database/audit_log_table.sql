-- ========================================
-- Audit Log Table Creation Script
-- Schema: b2b_dev
-- Purpose: Create audit_log table for tracking user actions
-- ========================================

-- Set search path to use b2b_dev schema
SET search_path TO "b2b_dev", public;

-- Create audit_log table
CREATE TABLE "b2b_dev".audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event TEXT NOT NULL,
    user_id UUID NULL,
    action TEXT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ip_address TEXT NULL,
    CONSTRAINT fk_audit_log_user FOREIGN KEY (user_id) REFERENCES "b2b_dev".users(id) ON DELETE SET NULL
);

-- Create indexes for performance optimization
CREATE INDEX idx_audit_log_user_id ON "b2b_dev".audit_log(user_id);
CREATE INDEX idx_audit_log_timestamp ON "b2b_dev".audit_log(timestamp);
CREATE INDEX idx_audit_log_event ON "b2b_dev".audit_log(event);

-- Create composite index for common queries
CREATE INDEX idx_audit_log_user_timestamp ON "b2b_dev".audit_log(user_id, timestamp DESC);

-- Add comments for documentation
COMMENT ON TABLE "b2b_dev".audit_log IS 'Audit log table for tracking user actions and system events';
COMMENT ON COLUMN "b2b_dev".audit_log.id IS 'Unique identifier for each audit log entry';
COMMENT ON COLUMN "b2b_dev".audit_log.event IS 'Type of event (USER_LOGIN, POST_CREATED, etc.)';
COMMENT ON COLUMN "b2b_dev".audit_log.user_id IS 'Reference to user who performed the action (nullable for system events)';
COMMENT ON COLUMN "b2b_dev".audit_log.action IS 'Detailed description of the action performed';
COMMENT ON COLUMN "b2b_dev".audit_log.timestamp IS 'When the action occurred';
COMMENT ON COLUMN "b2b_dev".audit_log.ip_address IS 'IP address from which action was performed';

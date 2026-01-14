-- Migration script to alter users table
-- Add active column, remove status column, and add audit columns for account deactivation feature
-- Schema: b2b_dev

-- Add active column to users table
ALTER TABLE "b2b_dev".users 
ADD COLUMN active BOOLEAN DEFAULT true;

-- Add audit columns for tracking changes
ALTER TABLE "b2b_dev".users 
ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "b2b_dev".users 
ADD COLUMN updated_by UUID;

ALTER TABLE "b2b_dev".users 
ADD COLUMN deleted_at TIMESTAMP;

-- Update existing users to be active (since they were previously active)
UPDATE "b2b_dev".users 
SET active = true 
WHERE active IS NULL;

-- Make active column NOT NULL after setting default values
ALTER TABLE "b2b_dev".users 
ALTER COLUMN active SET NOT NULL;

-- Remove status column (assuming it exists and is no longer needed)
-- Note: This will fail if status column doesn't exist, which is fine
ALTER TABLE "b2b_dev".users 
DROP COLUMN IF EXISTS status;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_users_active ON "b2b_dev".users(active);
CREATE INDEX IF NOT EXISTS idx_users_updated_at ON "b2b_dev".users(updated_at);
CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON "b2b_dev".users(deleted_at);

-- Add comments to document the changes
COMMENT ON COLUMN "b2b_dev".users.active IS 'Indicates if the user account is active (true) or deactivated (false)';
COMMENT ON COLUMN "b2b_dev".users.updated_at IS 'Timestamp when the user record was last updated';
COMMENT ON COLUMN "b2b_dev".users.updated_by IS 'UUID of the user who last updated this record';
COMMENT ON COLUMN "b2b_dev".users.deleted_at IS 'Timestamp when the user record was soft deleted (NULL if not deleted)';

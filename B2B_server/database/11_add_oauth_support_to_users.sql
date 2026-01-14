-- ========================================
-- Add OAuth Support to Users Table
-- Migration: 11_add_oauth_support_to_users.sql
-- Purpose: Enable Google OAuth authentication support
-- ========================================

-- Set search path to use b2b_dev schema
SET search_path TO "b2b_dev", public;

-- Add OAuth-related columns to users table
ALTER TABLE "b2b_dev".users
  -- Make password_hash nullable for OAuth users
  ALTER COLUMN password_hash DROP NOT NULL,
  
  -- Add authentication provider (local, google, etc.)
  ADD COLUMN IF NOT EXISTS provider VARCHAR(50) DEFAULT 'local' 
    CHECK (provider IN ('local', 'google', 'facebook', 'linkedin')),
  
  -- Add OAuth provider ID (google_id, facebook_id, etc.)
  ADD COLUMN IF NOT EXISTS provider_id VARCHAR(255),
  
  -- Add user's name from OAuth provider
  ADD COLUMN IF NOT EXISTS name VARCHAR(255),
  
  -- Add profile picture URL from OAuth provider
  ADD COLUMN IF NOT EXISTS picture TEXT,
  
  -- Track last login timestamp
  ADD COLUMN IF NOT EXISTS last_login TIMESTAMP,
  
  -- Track account creation and updates
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Add unique constraint on provider + provider_id combination
-- This ensures one account per provider (e.g., one Google account)
ALTER TABLE "b2b_dev".users
  ADD CONSTRAINT unique_provider_id 
  UNIQUE (provider, provider_id);

-- Add check constraint to ensure OAuth users have provider_id
-- Local users must have password_hash
ALTER TABLE "b2b_dev".users
  ADD CONSTRAINT check_auth_method 
  CHECK (
    (provider = 'local' AND password_hash IS NOT NULL) OR
    (provider != 'local' AND provider_id IS NOT NULL)
  );

-- Create index on provider_id for faster OAuth lookups
CREATE INDEX IF NOT EXISTS idx_users_provider_id 
  ON "b2b_dev".users(provider, provider_id);

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_email 
  ON "b2b_dev".users(email);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_modtime
    BEFORE UPDATE ON "b2b_dev".users
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();

-- Add comments for documentation
COMMENT ON COLUMN "b2b_dev".users.provider IS 'Authentication provider: local (email/password), google, facebook, linkedin';
COMMENT ON COLUMN "b2b_dev".users.provider_id IS 'Unique identifier from OAuth provider (e.g., Google user ID)';
COMMENT ON COLUMN "b2b_dev".users.name IS 'User''s full name from OAuth provider or manual input';
COMMENT ON COLUMN "b2b_dev".users.picture IS 'Profile picture URL from OAuth provider';
COMMENT ON COLUMN "b2b_dev".users.last_login IS 'Timestamp of user''s last successful login';

-- ========================================
-- ROLLBACK SCRIPT (for reference)
-- Run these commands to undo this migration:
-- ========================================
-- ALTER TABLE "b2b_dev".users DROP CONSTRAINT IF EXISTS check_auth_method;
-- ALTER TABLE "b2b_dev".users DROP CONSTRAINT IF EXISTS unique_provider_id;
-- DROP INDEX IF EXISTS "b2b_dev".idx_users_provider_id;
-- DROP INDEX IF EXISTS "b2b_dev".idx_users_email;
-- DROP TRIGGER IF EXISTS update_users_modtime ON "b2b_dev".users;
-- DROP FUNCTION IF EXISTS update_modified_column();
-- ALTER TABLE "b2b_dev".users 
--   DROP COLUMN IF EXISTS provider,
--   DROP COLUMN IF EXISTS provider_id,
--   DROP COLUMN IF EXISTS name,
--   DROP COLUMN IF EXISTS picture,
--   DROP COLUMN IF EXISTS last_login,
--   DROP COLUMN IF EXISTS created_at,
--   DROP COLUMN IF EXISTS updated_at,
--   ALTER COLUMN password_hash SET NOT NULL;

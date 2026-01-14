-- ========================================
-- Migration: Add tutorial_status to users table
-- Purpose: Track user tutorial completion status
-- Date: 17 November 2025
-- ========================================

-- For Development Schema (b2b_dev)
-- ========================================

-- Step 1: Create ENUM type for tutorial status in b2b_dev
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tutorial_status_enum' AND typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'b2b_dev')) THEN
        CREATE TYPE "b2b_dev".tutorial_status_enum AS ENUM ('incomplete', 'complete', 'skipped');
    END IF;
END $$;

-- Step 2: Add tutorial_status column to users table in b2b_dev
ALTER TABLE "b2b_dev".users 
ADD COLUMN IF NOT EXISTS tutorial_status "b2b_dev".tutorial_status_enum DEFAULT 'incomplete';

-- Step 3: Add comment to describe the column
COMMENT ON COLUMN "b2b_dev".users.tutorial_status IS 'Tracks user tutorial completion: incomplete (default), complete, or skipped';

-- Step 4: Update existing users to have incomplete status (if any exist without it)
UPDATE "b2b_dev".users 
SET tutorial_status = 'incomplete' 
WHERE tutorial_status IS NULL;


-- For Production Schema (b2b)
-- ========================================

-- Step 1: Create ENUM type for tutorial status in b2b
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tutorial_status_enum' AND typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'b2b')) THEN
        CREATE TYPE "b2b".tutorial_status_enum AS ENUM ('incomplete', 'complete', 'skipped');
    END IF;
END $$;

-- Step 2: Add tutorial_status column to users table in b2b
ALTER TABLE "b2b".users 
ADD COLUMN IF NOT EXISTS tutorial_status "b2b".tutorial_status_enum DEFAULT 'incomplete';

-- Step 3: Add comment to describe the column
COMMENT ON COLUMN "b2b".users.tutorial_status IS 'Tracks user tutorial completion: incomplete (default), complete, or skipped';

-- Step 4: Update existing users to have incomplete status (if any exist without it)
UPDATE "b2b".users 
SET tutorial_status = 'incomplete' 
WHERE tutorial_status IS NULL;


-- ========================================
-- USAGE INSTRUCTIONS
-- ========================================

/*
HOW TO USE THIS MIGRATION:

1. **Run the migration file:**
   Connect to your PostgreSQL database and execute this SQL file:
   
   psql -U your_username -d your_database -f database/12_add_tutorial_status_to_users.sql

2. **Verify the changes:**
   -- Check if column exists in development schema
   SELECT column_name, data_type, column_default 
   FROM information_schema.columns 
   WHERE table_schema = 'b2b_dev' 
   AND table_name = 'users' 
   AND column_name = 'tutorial_status';

   -- Check if column exists in production schema
   SELECT column_name, data_type, column_default 
   FROM information_schema.columns 
   WHERE table_schema = 'b2b' 
   AND table_name = 'users' 
   AND column_name = 'tutorial_status';

3. **Test with sample data:**
   -- Insert a new user (will have default 'incomplete' status)
   INSERT INTO "b2b_dev".users (email, password_hash) 
   VALUES ('test@example.com', 'hashed_password_here');

   -- Check the tutorial status
   SELECT id, email, tutorial_status FROM "b2b_dev".users WHERE email = 'test@example.com';

   -- Update tutorial status to 'complete'
   UPDATE "b2b_dev".users 
   SET tutorial_status = 'complete' 
   WHERE email = 'test@example.com';

   -- Update tutorial status to 'skipped'
   UPDATE "b2b_dev".users 
   SET tutorial_status = 'skipped' 
   WHERE email = 'test@example.com';

4. **Check ENUM values:**
   -- View the allowed enum values for b2b_dev
   SELECT e.enumlabel 
   FROM pg_enum e 
   JOIN pg_type t ON e.enumtypid = t.oid 
   JOIN pg_namespace n ON t.typnamespace = n.oid
   WHERE t.typname = 'tutorial_status_enum' AND n.nspname = 'b2b_dev'
   ORDER BY e.enumsortorder;

   -- View the allowed enum values for b2b
   SELECT e.enumlabel 
   FROM pg_enum e 
   JOIN pg_type t ON e.enumtypid = t.oid 
   JOIN pg_namespace n ON t.typnamespace = n.oid
   WHERE t.typname = 'tutorial_status_enum' AND n.nspname = 'b2b'
   ORDER BY e.enumsortorder;

5. **Rollback (if needed):**
   -- Remove the column from b2b_dev
   ALTER TABLE "b2b_dev".users DROP COLUMN IF EXISTS tutorial_status;
   DROP TYPE IF EXISTS "b2b_dev".tutorial_status_enum;

   -- Remove the column from b2b
   ALTER TABLE "b2b".users DROP COLUMN IF EXISTS tutorial_status;
   DROP TYPE IF EXISTS "b2b".tutorial_status_enum;

NOTES:
- The default value is 'incomplete' for new users
- Valid values: 'incomplete', 'complete', 'skipped'
- This migration is idempotent (can be run multiple times safely)
- Both development (b2b_dev) and production (b2b) schemas are updated
*/

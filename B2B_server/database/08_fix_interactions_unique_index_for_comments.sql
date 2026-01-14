-- ========================================
-- Fix Interactions Unique Index
-- Schema: b2b_dev
-- Purpose: Allow multiple comments/replies from the same user on the same post
-- ========================================

-- Drop the existing unique index that prevents multiple comments
-- This DO block finds and drops the index regardless of which schema it's in
DO $$
DECLARE
    idx_schema TEXT;
    idx_name TEXT := 'idx_interactions_unique_user_post_type';
BEGIN
    -- Find the schema where the index exists
    SELECT schemaname INTO idx_schema
    FROM pg_indexes
    WHERE indexname = idx_name
    LIMIT 1;
    
    -- If found, drop it
    IF idx_schema IS NOT NULL THEN
        EXECUTE format('DROP INDEX IF EXISTS %I.%I', idx_schema, idx_name);
        RAISE NOTICE 'Dropped index % from schema %', idx_name, idx_schema;
    ELSE
        RAISE NOTICE 'Index % not found, skipping drop', idx_name;
    END IF;
END $$;

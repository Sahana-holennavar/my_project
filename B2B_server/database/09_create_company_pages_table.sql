-- ========================================
-- Create company_pages table
-- ========================================

CREATE TABLE IF NOT EXISTS "b2b_dev".company_pages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES "b2b_dev".users(id) ON DELETE CASCADE,
    company_profile_data JSONB NOT NULL,
    privacy_settings JSONB NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Ensure owners can be queried efficiently
CREATE INDEX IF NOT EXISTS idx_company_pages_owner_id ON "b2b_dev".company_pages(owner_id);
CREATE INDEX IF NOT EXISTS idx_company_pages_is_active ON "b2b_dev".company_pages(is_active);

-- Unique index to prevent duplicate company names (case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS idx_company_pages_company_name_unique
ON "b2b_dev".company_pages ((LOWER(company_profile_data->>'companyName')));


-- ========================================
-- Create company_profile_schema table
-- ========================================

CREATE TABLE IF NOT EXISTS "b2b_dev".company_profile_schema (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    field_name TEXT NOT NULL,
    field_type TEXT NOT NULL,
    section TEXT NOT NULL,
    required BOOLEAN NOT NULL DEFAULT FALSE,
    rules JSONB NOT NULL,
    display_order INTEGER NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_company_profile_schema_field
    ON "b2b_dev".company_profile_schema(section, field_name);

CREATE INDEX IF NOT EXISTS idx_company_profile_schema_display_order
    ON "b2b_dev".company_profile_schema(display_order);

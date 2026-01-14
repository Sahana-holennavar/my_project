-- ========================================
-- Create company_pages_members table
-- ========================================

CREATE TABLE IF NOT EXISTS "b2b_dev".company_pages_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_page_id UUID NOT NULL REFERENCES "b2b_dev".company_pages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES "b2b_dev".users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL CHECK (role IN ('owner', 'admin', 'editor')),
    invited_by UUID REFERENCES "b2b_dev".users(id),
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_company_pages_members_company_page_id ON "b2b_dev".company_pages_members(company_page_id);
CREATE INDEX IF NOT EXISTS idx_company_pages_members_user_id ON "b2b_dev".company_pages_members(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_company_pages_members_unique ON "b2b_dev".company_pages_members(company_page_id, user_id);


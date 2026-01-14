-- ========================================
-- Create company_posts table
-- ========================================

-- Uses the same structure as posts table but links to company_pages instead of users.

CREATE TABLE IF NOT EXISTS "b2b_dev".company_posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_page_id UUID NOT NULL,
    content TEXT,
    type VARCHAR(20) CHECK (type IN ('text', 'image', 'video', 'link')),
    media JSONB,
    audience VARCHAR(20) DEFAULT 'public' CHECK (audience IN ('public', 'private', 'connections')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    shares INT DEFAULT 0,
    saves INT DEFAULT 0,
    likes INT DEFAULT 0,
    comments INT DEFAULT 0,
    reposts INT DEFAULT 0,
    tags JSONB,
    CONSTRAINT fk_company_post_page FOREIGN KEY (company_page_id)
        REFERENCES "b2b_dev".company_pages(id) ON DELETE RESTRICT
);

-- Helpful indexes for querying by company and recency
CREATE INDEX IF NOT EXISTS idx_company_posts_company_page_id
    ON "b2b_dev".company_posts(company_page_id);

CREATE INDEX IF NOT EXISTS idx_company_posts_created_at
    ON "b2b_dev".company_posts(created_at DESC);



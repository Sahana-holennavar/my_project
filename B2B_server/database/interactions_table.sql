-- ========================================
-- Interactions Table Creation Script
-- Schema: b2b_dev
-- Purpose: Create interactions table for post interactions (like, comment, share, save, report)
-- ========================================

-- Interactions table
CREATE TABLE "b2b_dev".interactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    post_id UUID NOT NULL,
    interaction_type JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_interaction_user FOREIGN KEY (user_id) REFERENCES "b2b_dev".users(id) ON DELETE CASCADE,
    CONSTRAINT fk_interaction_post FOREIGN KEY (post_id) REFERENCES "b2b_dev".posts(id) ON DELETE CASCADE
);

-- Create unique constraint to prevent duplicate interactions
CREATE UNIQUE INDEX idx_interactions_unique_user_post_type 
ON "b2b_dev".interactions(user_id, post_id, (interaction_type->>'type'));

-- Create indexes for better performance
CREATE INDEX idx_interactions_user_id ON "b2b_dev".interactions(user_id);
CREATE INDEX idx_interactions_post_id ON "b2b_dev".interactions(post_id);
CREATE INDEX idx_interactions_type ON "b2b_dev".interactions USING GIN(interaction_type);
CREATE INDEX idx_interactions_created_at ON "b2b_dev".interactions(created_at);

-- Add comments for documentation
COMMENT ON TABLE "b2b_dev".interactions IS 'Stores all user interactions with posts (likes, comments, shares, saves, reports)';
COMMENT ON COLUMN "b2b_dev".interactions.interaction_type IS 'JSONB field storing interaction details like type, content, timestamp, etc.';
COMMENT ON COLUMN "b2b_dev".interactions.user_id IS 'Reference to the user who performed the interaction';
COMMENT ON COLUMN "b2b_dev".interactions.post_id IS 'Reference to the post that was interacted with';

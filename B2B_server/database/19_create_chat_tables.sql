-- Migration: Create chat functionality tables
-- Description: Creates conversations, conversation_participants, and messages tables with indexes
-- CREATE TABLE IF NOT EXISTS "b2b_dev".contest 
-- Create conversations table
CREATE TABLE IF NOT EXISTS "b2b_dev".conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    is_group BOOLEAN NOT NULL DEFAULT FALSE,
    title TEXT,
    created_by UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create conversation_participants table
CREATE TABLE IF NOT EXISTS "b2b_dev".conversation_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL,
    user_id UUID NOT NULL,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT fk_conversation
        FOREIGN KEY (conversation_id)
        REFERENCES "b2b_dev".conversations(id)
        ON DELETE CASCADE,
    CONSTRAINT unique_conversation_user
        UNIQUE (conversation_id, user_id)
);

-- Create messages table
CREATE TABLE IF NOT EXISTS "b2b_dev".messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL,
    sender_id UUID NOT NULL,
    content JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    edited_at TIMESTAMPTZ,
    is_forwarded BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT fk_conversation_messages
        FOREIGN KEY (conversation_id)
        REFERENCES "b2b_dev".conversations(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_sender_user
        FOREIGN KEY (sender_id)
        REFERENCES "b2b_dev".users(id)
);

-- Create indexes for messages table
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON "b2b_dev".messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON "b2b_dev".messages(created_at);

-- Create indexes for conversation_participants table
CREATE INDEX IF NOT EXISTS idx_conversation_participants_user_id ON "b2b_dev".conversation_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_participants_conversation_id ON "b2b_dev".conversation_participants(conversation_id);

-- Add comments for documentation
COMMENT ON TABLE "b2b_dev".conversations IS 'Stores conversations (both one-on-one and group chats)';
COMMENT ON TABLE "b2b_dev".conversation_participants IS 'Stores participants in each conversation';
COMMENT ON TABLE "b2b_dev".messages IS 'Stores messages within conversations';

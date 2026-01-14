-- ========================================
-- Create Contest Tables
-- Schema: b2b_dev (Development) and b2b (Production)
-- Purpose: Store contest information and user submissions
-- ========================================

-- For Development Schema (b2b_dev)

-- Create Contest Table
CREATE TABLE IF NOT EXISTS "b2b_dev".contest (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    problem_statement TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed', 'cancelled')),
    start_time TIMESTAMP NULL,
    end_time TIMESTAMP NULL,
    created_by UUID NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    poster TEXT,
    CONSTRAINT fk_contest_created_by FOREIGN KEY (created_by) REFERENCES "b2b_dev".users(id) ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_contest_status ON "b2b_dev".contest(status);
CREATE INDEX IF NOT EXISTS idx_contest_created_by ON "b2b_dev".contest(created_by);
CREATE INDEX IF NOT EXISTS idx_contest_start_time ON "b2b_dev".contest(start_time);
CREATE INDEX IF NOT EXISTS idx_contest_end_time ON "b2b_dev".contest(end_time);

-- Add comments for documentation
COMMENT ON TABLE "b2b_dev".contest IS 'Stores contest/challenge information created by organizers';
COMMENT ON COLUMN "b2b_dev".contest.id IS 'Primary key (UUID)';
COMMENT ON COLUMN "b2b_dev".contest.title IS 'Contest title';
COMMENT ON COLUMN "b2b_dev".contest.description IS 'Contest description';
COMMENT ON COLUMN "b2b_dev".contest.problem_statement IS 'Problem statement for the contest';
COMMENT ON COLUMN "b2b_dev".contest.status IS 'Contest status: draft, active, completed, cancelled';
COMMENT ON COLUMN "b2b_dev".contest.start_time IS 'Contest start time';
COMMENT ON COLUMN "b2b_dev".contest.end_time IS 'Contest end time';
COMMENT ON COLUMN "b2b_dev".contest.created_by IS 'Foreign key to users.id (organizer)';

-- Create Contest Answers Table
CREATE TABLE IF NOT EXISTS "b2b_dev".contest_answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contest_id UUID NOT NULL,
    user_id UUID NOT NULL,
    answer JSONB DEFAULT NULL,
    winner BOOLEAN NOT NULL DEFAULT false,
    user_info JSONB DEFAULT NULL,
    has_profile BOOLEAN DEFAULT false,
    submitted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_contest_answer_contest FOREIGN KEY (contest_id) REFERENCES "b2b_dev".contest(id) ON DELETE CASCADE,
    CONSTRAINT fk_contest_answer_user FOREIGN KEY (user_id) REFERENCES "b2b_dev".users(id) ON DELETE CASCADE,
    CONSTRAINT uk_contest_answer_user_contest UNIQUE (contest_id, user_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_contest_answers_contest_id ON "b2b_dev".contest_answers(contest_id);
CREATE INDEX IF NOT EXISTS idx_contest_answers_user_id ON "b2b_dev".contest_answers(user_id);
CREATE INDEX IF NOT EXISTS idx_contest_answers_winner ON "b2b_dev".contest_answers(winner);
CREATE INDEX IF NOT EXISTS idx_contest_answers_submitted_at ON "b2b_dev".contest_answers(submitted_at);

-- Add comments for documentation
COMMENT ON TABLE "b2b_dev".contest_answers IS 'Stores user submissions for contests';
COMMENT ON COLUMN "b2b_dev".contest_answers.id IS 'Primary key (UUID)';
COMMENT ON COLUMN "b2b_dev".contest_answers.contest_id IS 'Foreign key to contest.id';
COMMENT ON COLUMN "b2b_dev".contest_answers.user_id IS 'Foreign key to users.id (participant)';
COMMENT ON COLUMN "b2b_dev".contest_answers.answer IS 'Submission file details in JSONB format: {file_name, file_url}';
COMMENT ON COLUMN "b2b_dev".contest_answers.winner IS 'Whether this submission is marked as winner';
COMMENT ON COLUMN "b2b_dev".contest_answers.submitted_at IS 'Submission timestamp';


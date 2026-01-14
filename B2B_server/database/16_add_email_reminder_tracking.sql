-- Add email reminder tracking to existing notifications table
-- This tracks when reminder emails have been sent for unacted requests

-- Add columns to track reminder emails
ALTER TABLE "b2b_dev".notifications
ADD COLUMN IF NOT EXISTS reminder_email_sent BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS reminder_email_sent_at TIMESTAMP NULL,
ADD COLUMN IF NOT EXISTS reminder_count INT DEFAULT 0;

-- Add index for better query performance on reminder tracking
CREATE INDEX IF NOT EXISTS idx_notifications_reminder_email_sent 
ON "b2b_dev".notifications(reminder_email_sent);

CREATE INDEX IF NOT EXISTS idx_notifications_reminder_email_sent_at 
ON "b2b_dev".notifications(reminder_email_sent_at);

-- Add index for finding unacted requests that need reminders
CREATE INDEX IF NOT EXISTS idx_notifications_unacted_reminders 
ON "b2b_dev".notifications(read, created_at) 
WHERE read = FALSE AND delivery_method = 'email';

-- Also add to production schema
ALTER TABLE "b2b".notifications
ADD COLUMN IF NOT EXISTS reminder_email_sent BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS reminder_email_sent_at TIMESTAMP NULL,
ADD COLUMN IF NOT EXISTS reminder_count INT DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_notifications_reminder_email_sent 
ON "b2b".notifications(reminder_email_sent);

CREATE INDEX IF NOT EXISTS idx_notifications_reminder_email_sent_at 
ON "b2b".notifications(reminder_email_sent_at);

CREATE INDEX IF NOT EXISTS idx_notifications_unacted_reminders 
ON "b2b".notifications(read, created_at) 
WHERE read = FALSE AND delivery_method = 'email';

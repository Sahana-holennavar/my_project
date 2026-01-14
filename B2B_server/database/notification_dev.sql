-- DROP TABLES IF THEY EXIST (in dependency order)
DROP TABLE IF EXISTS "b2b_dev".notification_audit CASCADE;
DROP TABLE IF EXISTS "b2b_dev".notification_preferences CASCADE;
DROP TABLE IF EXISTS "b2b_dev".notifications CASCADE;

-- NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS "b2b_dev".notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    content TEXT NOT NULL CHECK (length(content) > 0),
    payload JSONB DEFAULT '{}'::jsonb,
    type VARCHAR(100) NOT NULL,
    read BOOLEAN DEFAULT FALSE,
    delivery_method VARCHAR(20) DEFAULT 'in_app' CHECK (delivery_method IN ('email', 'in_app')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_notifications_user_id FOREIGN KEY (user_id) REFERENCES "b2b_dev".users(id) ON DELETE CASCADE
);

-- NOTIFICATION_PREFERENCES TABLE
CREATE TABLE IF NOT EXISTS "b2b_dev".notification_preferences (
    user_id UUID NOT NULL,
    type VARCHAR(100) NOT NULL,
    email BOOLEAN DEFAULT TRUE,
    in_app BOOLEAN DEFAULT TRUE,
    enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, type),
    CONSTRAINT fk_notification_preferences_user_id FOREIGN KEY (user_id) REFERENCES "b2b_dev".users(id) ON DELETE CASCADE
);

-- NOTIFICATION_AUDIT TABLE
CREATE TABLE IF NOT EXISTS "b2b_dev".notification_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event VARCHAR(100) NOT NULL,
    job_id VARCHAR(100),
    status VARCHAR(50) NOT NULL CHECK (status IN ('pending','success','failed','retrying')),
    retries INT DEFAULT 0 CHECK (retries >= 0),
    error_log TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notification_id UUID NULL,
    user_id UUID NULL,
    CONSTRAINT fk_notification_audit_notification_id FOREIGN KEY (notification_id) REFERENCES "b2b_dev".notifications(id) ON DELETE SET NULL,
    CONSTRAINT fk_notification_audit_user_id FOREIGN KEY (user_id) REFERENCES "b2b_dev".users(id) ON DELETE SET NULL
);

-- INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON "b2b_dev".notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON "b2b_dev".notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON "b2b_dev".notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON "b2b_dev".notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_delivery_method ON "b2b_dev".notifications(delivery_method);
CREATE INDEX IF NOT EXISTS idx_notifications_payload_gin ON "b2b_dev".notifications USING GIN (payload);

CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_id ON "b2b_dev".notification_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_preferences_type ON "b2b_dev".notification_preferences(type);

CREATE INDEX IF NOT EXISTS idx_notification_audit_user_id ON "b2b_dev".notification_audit(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_audit_notification_id ON "b2b_dev".notification_audit(notification_id);
CREATE INDEX IF NOT EXISTS idx_notification_audit_status ON "b2b_dev".notification_audit(status);
CREATE INDEX IF NOT EXISTS idx_notification_audit_timestamp ON "b2b_dev".notification_audit(timestamp);

-- COMMENTS FOR DOCUMENTATION
COMMENT ON TABLE "b2b_dev".notifications IS 'Stores notification details for users';
COMMENT ON COLUMN "b2b_dev".notifications.id IS 'Unique identifier for notification';
COMMENT ON COLUMN "b2b_dev".notifications.user_id IS 'Reference to user receiving the notification';
COMMENT ON COLUMN "b2b_dev".notifications.content IS 'Notification content';
COMMENT ON COLUMN "b2b_dev".notifications.payload IS 'Flexible JSONB payload for extra context';
COMMENT ON COLUMN "b2b_dev".notifications.type IS 'Type of notification';
COMMENT ON COLUMN "b2b_dev".notifications.read IS 'Read/unread status';
COMMENT ON COLUMN "b2b_dev".notifications.delivery_method IS 'Delivery method: email or in_app';
COMMENT ON COLUMN "b2b_dev".notifications.created_at IS 'Record creation timestamp';

COMMENT ON TABLE "b2b_dev".notification_preferences IS 'Stores user notification preferences';
COMMENT ON COLUMN "b2b_dev".notification_preferences.user_id IS 'Reference to user';
COMMENT ON COLUMN "b2b_dev".notification_preferences.type IS 'Notification type';
COMMENT ON COLUMN "b2b_dev".notification_preferences.email IS 'Email channel enabled';
COMMENT ON COLUMN "b2b_dev".notification_preferences.in_app IS 'In-app channel enabled';
COMMENT ON COLUMN "b2b_dev".notification_preferences.enabled IS 'Preference enabled';
COMMENT ON COLUMN "b2b_dev".notification_preferences.created_at IS 'Record creation timestamp';
COMMENT ON COLUMN "b2b_dev".notification_preferences.updated_at IS 'Last update timestamp';

COMMENT ON TABLE "b2b_dev".notification_audit IS 'Audit log for notification delivery and events';
COMMENT ON COLUMN "b2b_dev".notification_audit.id IS 'Unique identifier for audit record';
COMMENT ON COLUMN "b2b_dev".notification_audit.event IS 'Audit event type';
COMMENT ON COLUMN "b2b_dev".notification_audit.job_id IS 'BullMQ job reference';
COMMENT ON COLUMN "b2b_dev".notification_audit.status IS 'Status of notification event';
COMMENT ON COLUMN "b2b_dev".notification_audit.retries IS 'Retry count';
COMMENT ON COLUMN "b2b_dev".notification_audit.error_log IS 'Error details if any';
COMMENT ON COLUMN "b2b_dev".notification_audit.timestamp IS 'Audit event timestamp';
COMMENT ON COLUMN "b2b_dev".notification_audit.notification_id IS 'Reference to notification';
COMMENT ON COLUMN "b2b_dev".notification_audit.user_id IS 'Reference to user';

-- TRIGGER FOR AUTOMATIC updated_at ON notification_preferences
CREATE OR REPLACE FUNCTION "b2b_dev".set_notification_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_notification_preferences_updated_at ON "b2b_dev".notification_preferences;

CREATE TRIGGER trg_set_notification_preferences_updated_at
BEFORE UPDATE ON "b2b_dev".notification_preferences
FOR EACH ROW
EXECUTE FUNCTION "b2b_dev".set_notification_preferences_updated_at();

-- VERIFICATION QUERIES (for manual check)
-- List all notification tables
-- SELECT tablename FROM pg_tables WHERE schemaname = 'b2b_dev' AND tablename LIKE 'notification%';

-- List all indexes for notification tables
-- SELECT * FROM pg_indexes WHERE schemaname = 'b2b_dev' AND tablename LIKE 'notification%';

-- Check trigger
-- \df+ "b2b_dev".set_notification_preferences_updated_at
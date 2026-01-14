-- Create password_reset_otps table for OTP-based password reset functionality
-- This table stores OTP codes for password reset requests

CREATE TABLE IF NOT EXISTS "b2b_dev".password_reset_otps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    otp VARCHAR(6) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    
    -- Foreign key constraint
    CONSTRAINT fk_password_reset_otps_user_id 
        FOREIGN KEY (user_id) REFERENCES "b2b_dev".users(id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_password_reset_otps_user_id ON "b2b_dev".password_reset_otps(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_otps_otp ON "b2b_dev".password_reset_otps(otp);
CREATE INDEX IF NOT EXISTS idx_password_reset_otps_expires_at ON "b2b_dev".password_reset_otps(expires_at);
CREATE INDEX IF NOT EXISTS idx_password_reset_otps_used_at ON "b2b_dev".password_reset_otps(used_at);

-- Add comments for documentation
COMMENT ON TABLE "b2b_dev".password_reset_otps IS 'Stores OTP codes for password reset requests';
COMMENT ON COLUMN "b2b_dev".password_reset_otps.id IS 'Unique identifier for OTP record';
COMMENT ON COLUMN "b2b_dev".password_reset_otps.user_id IS 'Reference to user requesting password reset';
COMMENT ON COLUMN "b2b_dev".password_reset_otps.otp IS '6-digit OTP code for password reset';
COMMENT ON COLUMN "b2b_dev".password_reset_otps.expires_at IS 'OTP expiration time (15 minutes from creation)';
COMMENT ON COLUMN "b2b_dev".password_reset_otps.used_at IS 'Timestamp when OTP was used for password reset';
COMMENT ON COLUMN "b2b_dev".password_reset_otps.created_at IS 'Record creation timestamp';

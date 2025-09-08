-- Create MFA codes table for Telegram-based authentication
CREATE TABLE IF NOT EXISTS mfa_codes (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    code VARCHAR(7) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    used_at TIMESTAMP,
    ip_address INET,
    user_agent TEXT
);

-- Add indexes for MFA codes
CREATE INDEX IF NOT EXISTS idx_mfa_codes_user_id ON mfa_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_mfa_codes_code ON mfa_codes(code);
CREATE INDEX IF NOT EXISTS idx_mfa_codes_expires_at ON mfa_codes(expires_at);
CREATE INDEX IF NOT EXISTS idx_mfa_codes_used ON mfa_codes(used);

-- Comments for MFA table
COMMENT ON TABLE mfa_codes IS 'Stores MFA codes sent via Telegram for login authentication';
COMMENT ON COLUMN mfa_codes.code IS '7-character alphanumeric MFA code';
COMMENT ON COLUMN mfa_codes.expires_at IS 'Expiration time for the MFA code (typically 5 minutes from creation)';

-- Also create the reminder_notifications table if it doesn't exist
CREATE TABLE IF NOT EXISTS reminder_notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    event_id INTEGER REFERENCES calendar_events(id) ON DELETE CASCADE,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reminder_type VARCHAR(50) DEFAULT '30_min_before',
    UNIQUE(user_id, event_id, reminder_type)
);

-- Add indexes for better performance on reminder_notifications
CREATE INDEX IF NOT EXISTS idx_reminder_notifications_user_event ON reminder_notifications(user_id, event_id);
CREATE INDEX IF NOT EXISTS idx_reminder_notifications_sent_at ON reminder_notifications(sent_at);
CREATE INDEX IF NOT EXISTS idx_reminder_notifications_type ON reminder_notifications(reminder_type);

-- Comments for reminder_notifications table
COMMENT ON TABLE reminder_notifications IS 'Tracks sent reminder notifications to prevent duplicates';
COMMENT ON COLUMN reminder_notifications.reminder_type IS 'Type of reminder sent (e.g., 30_min_before, 1_hour_before)';
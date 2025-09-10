-- Update analytics user to have analytics-only permissions
-- This script adds metadata to restrict the user to analytics-only access

-- First, let's add a metadata column to users table if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'user_metadata') THEN
        ALTER TABLE users ADD COLUMN user_metadata JSONB DEFAULT '{}';
    END IF;
END $$;

-- Update the analytics user to have analytics-only restrictions
UPDATE users 
SET user_metadata = jsonb_build_object(
    'access_level', 'analytics_readonly',
    'permissions', jsonb_build_array('view_analytics', 'view_events'),
    'restrictions', jsonb_build_array('no_event_modify', 'no_event_create', 'no_event_delete'),
    'created_by', 'system',
    'purpose', 'event_signup_analytics'
)
WHERE student_id = '1099999';

-- Update the security event log to reflect the permission change
INSERT INTO security_events (user_id, event_type, event_description, created_at, metadata)
SELECT 
    u.id,
    'ANALYTICS_USER_PERMISSIONS_UPDATED',
    'Analytics user permissions restricted to read-only analytics access',
    CURRENT_TIMESTAMP,
    '{"role": "admin", "access_level": "analytics_readonly", "permissions": ["view_analytics", "view_events"]}'::jsonb
FROM users u
WHERE u.student_id = '1099999';

-- Create an index on the metadata column for performance
CREATE INDEX IF NOT EXISTS idx_users_metadata_access_level 
ON users USING GIN ((user_metadata->>'access_level'));

-- Verify the update
SELECT 
    student_id, 
    role,
    user_metadata,
    updated_at
FROM users 
WHERE student_id = '1099999';

COMMENT ON COLUMN users.user_metadata IS 'JSON metadata for user permissions and restrictions';
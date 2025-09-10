-- Migration script to add analytics admin user
-- Username: 1099999, Password: ClubLeaders
-- This user will have access to event signup analytics only (read-only)

-- First, add user_metadata column if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'user_metadata') THEN
        ALTER TABLE users ADD COLUMN user_metadata JSONB DEFAULT '{}';
    END IF;
END $$;

-- Insert the analytics user with restricted permissions
INSERT INTO users (student_id, email, password_hash, role, email_verified, is_active, user_metadata, created_at) 
VALUES (
    '1099999',
    '1099999@mymail.sutd.edu.sg',
    '$2a$12$PNRFQpCEhMPeynoGmy3YcOlE4HRVsGpBhIfQJEnfZQOZ3dv32nmZ2',  -- bcrypt hash for 'ClubLeaders'
    'admin',
    TRUE,
    TRUE,
    jsonb_build_object(
        'access_level', 'analytics_readonly',
        'permissions', jsonb_build_array('view_analytics', 'view_events'),
        'restrictions', jsonb_build_array('no_event_modify', 'no_event_create', 'no_event_delete'),
        'created_by', 'system',
        'purpose', 'event_signup_analytics'
    ),
    CURRENT_TIMESTAMP
)
ON CONFLICT (student_id) DO UPDATE SET
    password_hash = EXCLUDED.password_hash,
    role = EXCLUDED.role,
    email_verified = EXCLUDED.email_verified,
    is_active = EXCLUDED.is_active,
    user_metadata = EXCLUDED.user_metadata,
    updated_at = CURRENT_TIMESTAMP;

-- Create an index on the metadata column for performance
CREATE INDEX IF NOT EXISTS idx_users_metadata_access_level 
ON users USING GIN ((user_metadata->>'access_level'));

-- Log the creation
INSERT INTO security_events (user_id, event_type, event_description, created_at, metadata)
SELECT 
    u.id,
    'ANALYTICS_USER_CREATED',
    'Analytics read-only admin user created for event signup tracking',
    CURRENT_TIMESTAMP,
    jsonb_build_object(
        'role', 'admin',
        'access_level', 'analytics_readonly',
        'permissions', u.user_metadata->'permissions',
        'restrictions', u.user_metadata->'restrictions',
        'purpose', 'event_analytics'
    )
FROM users u
WHERE u.student_id = '1099999';

-- Verify the user was created correctly
SELECT 
    id, 
    student_id, 
    email, 
    role, 
    email_verified, 
    is_active,
    user_metadata,
    created_at
FROM users 
WHERE student_id = '1099999';

-- Add comment to document the user's purpose
COMMENT ON COLUMN users.user_metadata IS 'JSON metadata for user permissions and restrictions';
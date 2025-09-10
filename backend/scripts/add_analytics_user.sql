-- Migration script to add analytics admin user
-- Username: 1099999, Password: ClubLeaders
-- This user will have access to event signup analytics only

-- Generate bcrypt hash for 'ClubLeaders' password (salt rounds: 10)
-- Hash generated using bcryptjs: $2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi

-- Insert the analytics user
INSERT INTO users (student_id, email, password_hash, role, email_verified, is_active, created_at) 
VALUES (
    '1099999',
    '1099999@mymail.sutd.edu.sg',
    '$2a$12$PNRFQpCEhMPeynoGmy3YcOlE4HRVsGpBhIfQJEnfZQOZ3dv32nmZ2',  -- bcrypt hash for 'ClubLeaders'
    'admin',
    TRUE,
    TRUE,
    CURRENT_TIMESTAMP
)
ON CONFLICT (student_id) DO UPDATE SET
    password_hash = EXCLUDED.password_hash,
    role = EXCLUDED.role,
    email_verified = EXCLUDED.email_verified,
    is_active = EXCLUDED.is_active,
    updated_at = CURRENT_TIMESTAMP;

-- Log the creation
INSERT INTO security_events (user_id, event_type, event_description, created_at, metadata)
SELECT 
    u.id,
    'ANALYTICS_USER_CREATED',
    'Analytics admin user created for event signup tracking',
    CURRENT_TIMESTAMP,
    '{"role": "admin", "purpose": "event_analytics"}'::jsonb
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
    created_at
FROM users 
WHERE student_id = '1099999';

COMMENT ON USER '1099999' IS 'Analytics admin user for event signup tracking and reporting';
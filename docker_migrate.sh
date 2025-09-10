#!/bin/bash

# Docker-based database migration for Dokploy
# This script runs the migration inside a Docker container

echo "🐳 Docker Analytics Migration for Dokploy"

# Check if container name is provided
if [ -z "$1" ]; then
    echo "Usage: $0 <postgres_container_name>"
    echo "Example: $0 webapp-postgres"
    echo ""
    echo "To find your container name, run:"
    echo "  docker ps | grep postgres"
    exit 1
fi

CONTAINER_NAME=$1

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}📋 Running migration in container: $CONTAINER_NAME${NC}"

# Run the SQL migration via docker exec
docker exec -i "$CONTAINER_NAME" psql -U webapp_user -d webapp_db << 'EOF'
-- Add user_metadata column if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'user_metadata') THEN
        ALTER TABLE users ADD COLUMN user_metadata JSONB DEFAULT '{}';
    END IF;
END $$;

-- Add the analytics admin user with restricted permissions
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

-- Create index for performance
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

-- Display verification
SELECT 
    student_id, 
    email, 
    role, 
    email_verified, 
    is_active,
    user_metadata,
    created_at
FROM users 
WHERE student_id = '1099999';
EOF

# Check if the command was successful
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Migration completed successfully${NC}"
    echo ""
    echo "Analytics user created:"
    echo "  Username: 1099999"
    echo "  Password: ClubLeaders"
    echo ""
    echo "The user can now access the analytics dashboard at /analytics"
else
    echo -e "${RED}❌ Migration failed${NC}"
    echo "Please check:"
    echo "1. Container name is correct: $CONTAINER_NAME"
    echo "2. Database user and database name are correct"
    echo "3. Container is running: docker ps"
    exit 1
fi
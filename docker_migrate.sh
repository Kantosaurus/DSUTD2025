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
-- Add the analytics admin user
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

-- Display verification
SELECT 
    student_id, 
    email, 
    role, 
    email_verified, 
    is_active,
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
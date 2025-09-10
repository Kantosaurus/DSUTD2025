#!/bin/bash

# Deployment script for Analytics User
# Run this script after deploying the updated code to add the analytics user to the database

echo "🚀 Starting Analytics User Deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if database connection string is provided
if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}❌ Error: DATABASE_URL environment variable not set${NC}"
    echo "Please set DATABASE_URL to your PostgreSQL connection string"
    echo "Example: export DATABASE_URL='postgresql://user:password@host:port/database'"
    exit 1
fi

echo -e "${YELLOW}📋 Running database migration...${NC}"

# Run the SQL migration
psql "$DATABASE_URL" << 'EOF'
-- First, add user_metadata column if it doesn't exist
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
ON users ((user_metadata->>'access_level'));

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
EOF

# Check if the command was successful
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Database migration completed successfully${NC}"
else
    echo -e "${RED}❌ Database migration failed${NC}"
    exit 1
fi

echo -e "${YELLOW}🔍 Verifying user creation...${NC}"

# Verify the user was created
VERIFICATION=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM users WHERE student_id = '1099999' AND role = 'admin' AND is_active = true;")

if [[ "$VERIFICATION" =~ [[:space:]]*1[[:space:]]* ]]; then
    echo -e "${GREEN}✅ Analytics user verified successfully${NC}"
    echo ""
    echo -e "${GREEN}🎉 Deployment Complete!${NC}"
    echo ""
    echo "Analytics user credentials:"
    echo "  Username: 1099999"
    echo "  Password: ClubLeaders"
    echo ""
    echo "Access the analytics dashboard at: /analytics"
    echo ""
    echo "The user has admin privileges and can:"
    echo "  • View all event signup statistics"
    echo "  • Filter and sort event data"
    echo "  • Access real-time analytics dashboard"
    echo "  • No MFA required (admin bypass)"
else
    echo -e "${RED}❌ User verification failed${NC}"
    echo "Please check the database logs and try again"
    exit 1
fi

echo ""
echo -e "${YELLOW}📝 Next steps:${NC}"
echo "1. Test login with the new credentials"
echo "2. Navigate to /analytics to verify the dashboard"
echo "3. Test filtering and sorting functionality"
echo "4. Verify all API endpoints are working"

echo ""
echo "🔒 Security note: This user has full admin access."
echo "   Change the password if needed through the application."

echo ""
echo -e "${GREEN}🏁 Analytics deployment completed successfully!${NC}"
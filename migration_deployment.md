# Database Migration for Analytics User Deployment

This document provides instructions for deploying the analytics user and functionality to the live Dokploy environment.

## Overview

This migration adds:
1. A new admin user with credentials `1099999` / `ClubLeaders`
2. Analytics API endpoints for event signup tracking
3. A dedicated analytics frontend page

## Database Migration Steps

### Step 1: Access Database
Connect to your PostgreSQL database on Dokploy:
```bash
# If using docker exec
docker exec -it <container_name> psql -U webapp_user -d webapp_db

# Or if using connection string
psql "<your_database_connection_string>"
```

### Step 2: Run Migration Script
Execute the following SQL commands:

```sql
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
```

### Step 3: Verify Migration
Check that the user was created successfully:
```sql
SELECT student_id, role, email_verified, is_active FROM users WHERE student_id = '1099999';
```
Expected result: One row with student_id='1099999', role='admin', email_verified=true, is_active=true

## Backend Deployment

### New API Endpoints Added
The following endpoints have been added to `/backend/routes/admin.js`:

1. `GET /api/admin/event-analytics` - Main analytics endpoint with filtering and sorting
2. `GET /api/admin/event-signups-detailed` - Detailed signup data by event
3. `GET /api/admin/analytics-summary` - Summary statistics for dashboard

### Files Modified
- `backend/routes/admin.js` - Added analytics endpoints
- `backend/scripts/add_analytics_user.sql` - Migration script for the user
- `backend/scripts/generate_hash.js` - Helper script for password hashing

## Frontend Deployment

### New Page Created
- `frontend/app/analytics/page.tsx` - Dedicated analytics dashboard

### Features
- Event signup statistics
- Filtering by event type (Mandatory/Optional)
- Sorting by signup count, fill percentage, or date
- Real-time dashboard stats
- Responsive design matching the existing UI

## Access Instructions

### For the Analytics User (1099999)
1. Navigate to the application homepage
2. Log in with:
   - Username: `1099999`
   - Password: `ClubLeaders`
3. Since this is an admin account, login will bypass MFA (no Telegram required)
4. Navigate to `/analytics` to view the analytics dashboard

### Analytics Dashboard Features
- **Total Events**: Count of all active events
- **Total Signups**: Sum of all event registrations
- **Mandatory vs Optional**: Breakdown by event type
- **Average Signups per Event**: Participation metrics
- **Event Details Table**: Complete list with signup counts and fill rates
- **Real-time Filtering**: By event type
- **Sorting Options**: By signup count, fill percentage, or date

## Verification Steps

1. **User Login Test**:
   - Try logging in with `1099999` / `ClubLeaders`
   - Verify admin access is granted
   - Confirm no MFA challenge is presented

2. **Analytics Page Test**:
   - Navigate to `/analytics`
   - Verify data loads correctly
   - Test filtering and sorting functionality
   - Check that statistics are calculated correctly

3. **API Endpoint Test**:
   - Test `GET /api/admin/event-analytics` 
   - Verify proper response format and data accuracy
   - Test with different query parameters

## Security Considerations

- The analytics user has full admin privileges (same as other admin accounts)
- Password follows security requirements (12+ chars, complexity)
- All API endpoints require authentication and admin role
- Audit logging is in place for user creation and access

## Rollback Instructions

If rollback is needed:
```sql
-- Remove the analytics user
DELETE FROM users WHERE student_id = '1099999';

-- Remove associated security events (optional)
DELETE FROM security_events WHERE event_description LIKE '%Analytics admin user%';
```

## Support

If issues arise:
1. Check application logs for authentication errors
2. Verify database connection and user creation
3. Ensure all API endpoints are accessible
4. Test frontend routing to `/analytics`

The analytics functionality integrates seamlessly with the existing authentication and authorization system, requiring no changes to other parts of the application.
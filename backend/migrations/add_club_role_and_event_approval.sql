-- Migration: Add club role and event approval system
-- Run this script to update existing database

-- Step 1: Drop and recreate role constraint to include 'club'
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('admin', 'student', 'club'));

-- Step 2: Add event approval columns to calendar_events
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected'));
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS approval_date TIMESTAMP;
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS approved_by INTEGER REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Step 3: Update existing events to approved status
UPDATE calendar_events SET status = 'approved', approval_date = created_at WHERE status IS NULL;

-- Step 4: Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_calendar_events_status ON calendar_events(status);
CREATE INDEX IF NOT EXISTS idx_calendar_events_user_id ON calendar_events(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_approved_by ON calendar_events(approved_by);

-- Step 5: Create event analytics view
CREATE OR REPLACE VIEW event_analytics AS
SELECT 
    ce.id,
    ce.title,
    ce.description,
    ce.event_date,
    ce.start_time,
    ce.end_time,
    ce.event_type,
    ce.location,
    ce.max_participants,
    ce.current_participants,
    ce.status,
    ce.user_id as creator_id,
    u.student_id as creator_student_id,
    u.role as creator_role,
    ce.approval_date,
    ce.approved_by,
    approver.student_id as approver_student_id,
    COALESCE(signup_stats.signup_count, 0) as actual_signups,
    COALESCE(signup_stats.signup_count, 0)::float / NULLIF(ce.max_participants, 0) * 100 as fill_percentage,
    ce.created_at,
    ce.updated_at
FROM calendar_events ce
LEFT JOIN users u ON ce.user_id = u.id
LEFT JOIN users approver ON ce.approved_by = approver.id
LEFT JOIN (
    SELECT event_id, COUNT(*) as signup_count
    FROM event_signups
    GROUP BY event_id
) signup_stats ON ce.id = signup_stats.event_id;

COMMENT ON VIEW event_analytics IS 'Comprehensive view for event analytics including signup statistics and approval information';
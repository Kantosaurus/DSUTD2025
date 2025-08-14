-- Create a test club user for testing purposes
-- Password is 'ClubTest123!' (bcrypt hash with 12 rounds)

INSERT INTO users (student_id, email, password_hash, role, email_verified, is_active) VALUES
('1009999', '1009999@mymail.sutd.edu.sg', '$2a$12$LVyoQ0eCMTJf8zEzuG.oBuEQ8xmZuY6QJQ1EwJ8B1DwJGHTMmhgKq', 'club', TRUE, TRUE)
ON CONFLICT (student_id) DO UPDATE SET 
role = 'club',
email_verified = TRUE,
is_active = TRUE;

-- Also update an existing user to be a club user for testing
UPDATE users SET role = 'club' WHERE student_id = '1007877';

-- Create a test pending event from the club user
INSERT INTO calendar_events (
  title, description, event_date, start_time, end_time, 
  event_type, location, color, max_participants, user_id,
  status, is_active
) VALUES (
  'Test Club Event', 
  'This is a test event created by a club user that requires approval.', 
  '2025-10-15', 
  '19:00:00', 
  '21:00:00',
  'Optional', 
  'Club Room A', 
  '#FF6B6B', 
  50, 
  (SELECT id FROM users WHERE student_id = '1009999'),
  'pending',
  TRUE
) ON CONFLICT DO NOTHING;
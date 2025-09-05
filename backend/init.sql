-- Create users table with proper authentication fields (must be first due to foreign key references)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    student_id VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'student' CHECK (role IN ('admin', 'student', 'club')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    failed_login_attempts INTEGER DEFAULT 0,
    account_locked_until TIMESTAMP,
    password_changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    require_password_change BOOLEAN DEFAULT FALSE,
    two_factor_enabled BOOLEAN DEFAULT FALSE,
    two_factor_secret VARCHAR(255),
    session_token_version INTEGER DEFAULT 1,
    email_verified BOOLEAN DEFAULT FALSE,
    email_verification_code VARCHAR(6),
    email_verification_expires TIMESTAMP,
    password_reset_token VARCHAR(255),
    password_reset_expires TIMESTAMP,
    telegram_handle VARCHAR(255),
    telegram_chat_id BIGINT
);

-- Create calendar_events table
CREATE TABLE IF NOT EXISTS calendar_events (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    event_date DATE NOT NULL,
    start_time TIME,
    end_time TIME,
    event_type VARCHAR(50),
    location VARCHAR(255),
    color VARCHAR(16),
    max_participants INTEGER,
    current_participants INTEGER DEFAULT 0,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create items table (placeholder - add proper fields as needed)
CREATE TABLE IF NOT EXISTS items (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create login attempts table for security monitoring
CREATE TABLE IF NOT EXISTS login_attempts (
    id SERIAL PRIMARY KEY,
    student_id VARCHAR(50) NOT NULL,
    ip_address INET,
    user_agent TEXT,
    success BOOLEAN NOT NULL,
    attempt_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    failure_reason VARCHAR(100)
);

-- Create user sessions table for session management
CREATE TABLE IF NOT EXISTS user_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    session_id VARCHAR(255) UNIQUE NOT NULL,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create security events table for audit logging
CREATE TABLE IF NOT EXISTS security_events (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    event_type VARCHAR(50) NOT NULL,
    event_description TEXT,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB
);

-- Create event signups table for tracking user event registrations
CREATE TABLE IF NOT EXISTS event_signups (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    event_id INTEGER REFERENCES calendar_events(id) ON DELETE CASCADE,
    signup_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, event_id)
);

-- Create survival kit tables
CREATE TABLE IF NOT EXISTS survival_kit_items (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    image_url VARCHAR(500),
    content TEXT NOT NULL,
    order_index INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS survival_kit_resources (
    id SERIAL PRIMARY KEY,
    survival_kit_item_id INTEGER REFERENCES survival_kit_items(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add unique constraint for ON CONFLICT clause
ALTER TABLE calendar_events ADD CONSTRAINT unique_event_schedule 
UNIQUE (title, event_date, start_time);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_calendar_events_date ON calendar_events(event_date);
CREATE INDEX IF NOT EXISTS idx_calendar_events_type ON calendar_events(event_type);
CREATE INDEX IF NOT EXISTS idx_users_student_id ON users(student_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_password_reset_token ON users(password_reset_token);
CREATE INDEX IF NOT EXISTS idx_users_telegram_handle ON users(telegram_handle);
CREATE INDEX IF NOT EXISTS idx_users_telegram_chat_id ON users(telegram_chat_id);
CREATE INDEX IF NOT EXISTS idx_event_signups_user_id ON event_signups(user_id);
CREATE INDEX IF NOT EXISTS idx_event_signups_event_id ON event_signups(event_id);
CREATE INDEX IF NOT EXISTS idx_event_signups_signup_date ON event_signups(signup_date);
CREATE INDEX IF NOT EXISTS idx_survival_kit_items_order ON survival_kit_items(order_index, is_active);
CREATE INDEX IF NOT EXISTS idx_survival_kit_resources_item_order ON survival_kit_resources(survival_kit_item_id, order_index);

-- Additional indexes for club user functionality
CREATE INDEX IF NOT EXISTS idx_calendar_events_user_id ON calendar_events(user_id);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for each table
CREATE TRIGGER update_items_updated_at 
    BEFORE UPDATE ON items 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_calendar_events_updated_at 
    BEFORE UPDATE ON calendar_events 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_survival_kit_items_updated_at 
    BEFORE UPDATE ON survival_kit_items 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_survival_kit_resources_updated_at 
    BEFORE UPDATE ON survival_kit_resources 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Create event analytics view for comprehensive event statistics
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
    ce.user_id as creator_id,
    u.student_id as creator_student_id,
    u.role as creator_role,
    COALESCE(signup_stats.signup_count, 0) as actual_signups,
    COALESCE(signup_stats.signup_count, 0)::float / NULLIF(ce.max_participants, 0) * 100 as fill_percentage,
    ce.created_at,
    ce.updated_at
FROM calendar_events ce
LEFT JOIN users u ON ce.user_id = u.id
LEFT JOIN (
    SELECT event_id, COUNT(*) as signup_count
    FROM event_signups
    GROUP BY event_id
) signup_stats ON ce.id = signup_stats.event_id;

COMMENT ON VIEW event_analytics IS 'Comprehensive view for event analytics including signup statistics';

-- Insert admin users with password 'DSUTDadmin' (bcrypt hash)
-- Note: This is a bcrypt hash of 'DSUTDadmin' with salt rounds 10
INSERT INTO users (student_id, email, password_hash, role, email_verified, is_active) VALUES
('1007667', '1007667@mymail.sutd.edu.sg', '$2a$10$1z.67uf.usNl82d5.On6DeIehT8pIF0vYf5cw54ySVmaIm7NczfuO', 'admin', TRUE, TRUE),
('1007771', '1007771@mymail.sutd.edu.sg', '$2a$10$1z.67uf.usNl82d5.On6DeIehT8pIF0vYf5cw54ySVmaIm7NczfuO', 'club', TRUE, TRUE),
('1008456', '1008456@mymail.sutd.edu.sg', '$2a$10$1z.67uf.usNl82d5.On6DeIehT8pIF0vYf5cw54ySVmaIm7NczfuO', 'admin', TRUE, TRUE),
('1007675', '1007675@mymail.sutd.edu.sg', '$2a$10$1z.67uf.usNl82d5.On6DeIehT8pIF0vYf5cw54ySVmaIm7NczfuO', 'admin', TRUE, TRUE),
('1009302', '1009302@mymail.sutd.edu.sg', '$2a$10$1z.67uf.usNl82d5.On6DeIehT8pIF0vYf5cw54ySVmaIm7NczfuO', 'admin', TRUE, TRUE),
('1009099', '1009099@mymail.sutd.edu.sg', '$2a$10$1z.67uf.usNl82d5.On6DeIehT8pIF0vYf5cw54ySVmaIm7NczfuO', 'admin', TRUE, TRUE),
('1009036', '1009036@mymail.sutd.edu.sg', '$2a$10$1z.67uf.usNl82d5.On6DeIehT8pIF0vYf5cw54ySVmaIm7NczfuO', 'admin', TRUE, TRUE),
('1009688', '1009688@mymail.sutd.edu.sg', '$2a$10$1z.67uf.usNl82d5.On6DeIehT8pIF0vYf5cw54ySVmaIm7NczfuO', 'admin', TRUE, TRUE),
('1009035', '1009035@mymail.sutd.edu.sg', '$2a$10$1z.67uf.usNl82d5.On6DeIehT8pIF0vYf5cw54ySVmaIm7NczfuO', 'admin', TRUE, TRUE),
('1007877', '1007877@mymail.sutd.edu.sg', '$2a$10$1z.67uf.usNl82d5.On6DeIehT8pIF0vYf5cw54ySVmaIm7NczfuO', 'admin', TRUE, TRUE),
('1009127', '1009127@mymail.sutd.edu.sg', '$2a$10$1z.67uf.usNl82d5.On6DeIehT8pIF0vYf5cw54ySVmaIm7NczfuO', 'admin', TRUE, TRUE),
('1008153', '1008153@mymail.sutd.edu.sg', '$2a$10$1z.67uf.usNl82d5.On6DeIehT8pIF0vYf5cw54ySVmaIm7NczfuO', 'admin', TRUE, TRUE),
('1008148', '1008148@mymail.sutd.edu.sg', '$2a$10$1z.67uf.usNl82d5.On6DeIehT8pIF0vYf5cw54ySVmaIm7NczfuO', 'admin', TRUE, TRUE),
ON CONFLICT (student_id) DO NOTHING;

-- Insert sample calendar events from seed-events.json (all pre-approved by admin)
INSERT INTO calendar_events (title, description, event_date, start_time, end_time, event_type, location, color, max_participants, current_participants, user_id, is_active) VALUES
('Dance Derivativez (DDZ) Session', 'Regular dance rehearsal for DDZ members.', '2025-09-24', '19:30:00', '22:30:00', 'Optional', 'Dance Studio', '#EF5800', NULL, 0, 1, TRUE),
('Dance Derivativez (DDZ) Session', 'Regular dance rehearsal for DDZ members.', '2025-09-26', '19:30:00', '22:30:00', 'Optional', 'Dance Studio', NULL, NULL, 0, 1, TRUE),
('Dance Derivativez (DDZ) Session', 'Regular dance rehearsal for DDZ members.', '2025-10-01', '19:30:00', '22:30:00', 'Optional', 'Dance Studio', NULL, NULL, 0, 1, TRUE),
('Dance Derivativez (DDZ) Session', 'Regular dance rehearsal for DDZ members.', '2025-10-03', '19:30:00', '22:30:00', 'Optional', 'Dance Studio', NULL, NULL, 0, 1, TRUE),
('Ultimate Frisbee Intro Session', 'Introductory session for Ultimate Frisbee. All experience levels welcome.', '2025-09-17', '19:30:00', '22:30:00', 'Optional', 'Outdoor Sports Field', NULL, NULL, 0, 1, TRUE),
('Ultimate Frisbee Weekly Session', 'Weekly Ultimate Frisbee pickup game after Orientation.', '2025-09-24', '19:30:00', '22:30:00', 'Optional', 'Outdoor Sports Field', NULL, NULL, 0, 1, TRUE),
('Photographic Circle (PhotogCircle) Meeting', 'Hands-on photography meetup and club introduction.', '2025-09-24', '15:00:00', '17:00:00', 'Optional', 'Lab 3.201', NULL, NULL, 0, 1, TRUE),
('Changi Coffee Corner Gathering', 'Casual coffee meet-up for conversation and networking.', '2025-09-24', '17:30:00', '18:30:00', 'Optional', 'Changi Coffee Corner', NULL, NULL, 0, 1, TRUE),
('Tchoukball Club Practice', 'Tchoukball practice open to new and returning members.', '2025-09-30', '20:00:00', '23:00:00', 'Optional', 'Indoor Sports Hall', NULL, NULL, 0, 1, TRUE),
('Tchoukball Club Practice', 'Tchoukball practice open to new and returning members.', '2025-10-02', '20:00:00', '23:00:00', 'Optional', 'Indoor Sports Hall', NULL, NULL, 0, 1, TRUE),
('Tchoukball Club Practice', 'Tchoukball practice open to new and returning members.', '2025-10-07', '20:00:00', '23:00:00', 'Optional', 'Indoor Sports Hall', NULL, NULL, 0, 1, TRUE),
('Tchoukball Club Practice', 'Tchoukball practice open to new and returning members.', '2025-10-09', '20:00:00', '23:00:00', 'Optional', 'Indoor Sports Hall', NULL, NULL, 0, 1, TRUE),
('Tchoukball Club Practice', 'Tchoukball practice open to new and returning members.', '2025-11-11', '20:00:00', '23:00:00', 'Optional', 'Indoor Sports Hall', NULL, NULL, 0, 1, TRUE),
('Tchoukball Club Practice', 'Tchoukball practice open to new and returning members.', '2025-11-13', '20:00:00', '23:00:00', 'Optional', 'Indoor Sports Hall', NULL, NULL, 0, 1, TRUE),
('Indonesian Cultural Club PADI Introduction', 'Introductory meet-up for Indonesian culture enthusiasts.', '2025-10-02', '18:00:00', '20:00:00', 'Optional', 'Cultural Hall', NULL, NULL, 0, 1, TRUE),
('Climbers Club Session', 'Climbing practice at the wall—open to all skill levels.', '2025-09-17', '19:00:00', '21:00:00', 'Optional', 'Climbing Wall', NULL, NULL, 0, 1, TRUE),
('Climbers Club Session', 'Climbing practice at the wall—open to all skill levels.', '2025-09-24', '19:00:00', '21:00:00', 'Optional', 'Climbing Wall', NULL, NULL, 0, 1, TRUE),
('Boxing Club Training', 'Boxing fundamentals and sparring drills.', '2025-09-17', '19:30:00', '20:30:00', 'Optional', 'Boxing Gym', NULL, NULL, 0, 1, TRUE),
('Boxing Club Training', 'Boxing fundamentals and sparring drills.', '2025-09-24', '19:30:00', '20:30:00', 'Optional', 'Boxing Gym', NULL, NULL, 0, 1, TRUE),
('Boxing Club Training', 'Boxing fundamentals and sparring drills.', '2025-10-01', '19:30:00', '20:30:00', 'Optional', 'Boxing Gym', NULL, NULL, 0, 1, TRUE),
('Boxing Club Training', 'Boxing fundamentals and sparring drills.', '2025-10-08', '19:30:00', '20:30:00', 'Optional', 'Boxing Gym', NULL, NULL, 0, 1, TRUE),
('Ballroom Dancing Club Session', 'Ballroom dance practice for all skill levels.', '2025-09-24', '19:30:00', '21:00:00', 'Optional', 'Dance Studio', NULL, NULL, 0, 1, TRUE),
('Ballroom Dancing Club Session', 'Ballroom dance practice for all skill levels.', '2025-10-01', '19:30:00', '21:00:00', 'Optional', 'Dance Studio', NULL, NULL, 0, 1, TRUE),
('Ballroom Dancing Club Session', 'Ballroom dance practice for all skill levels.', '2025-10-03', '19:30:00', '21:00:00', 'Optional', 'Dance Studio', NULL, NULL, 0, 1, TRUE),
('Ballroom Dancing Club Session', 'Ballroom dance practice for all skill levels.', '2025-10-08', '19:30:00', '21:00:00', 'Optional', 'Dance Studio', NULL, NULL, 0, 1, TRUE),
('Drama Club Rehearsal', 'Drama rehearsal and performance workshop.', '2025-10-01', '19:30:00', '22:00:00', 'Optional', 'Drama Theatre', NULL, NULL, 0, 1, TRUE),
('Drama Club Rehearsal', 'Drama rehearsal and performance workshop.', '2025-10-08', '19:30:00', '22:00:00', 'Optional', 'Drama Theatre', NULL, NULL, 0, 1, TRUE),
('Drama Club Rehearsal', 'Drama rehearsal and performance workshop.', '2025-10-10', '19:30:00', '22:00:00', 'Optional', 'Drama Theatre', NULL, NULL, 0, 1, TRUE),
('SUTDio Session', 'Creative audio-visual workshop and jam session.', '2025-09-18', '19:00:00', '22:00:00', 'Optional', 'Multipurpose Hall', NULL, NULL, 0, 1, TRUE),
('SUTDio Session', 'Creative audio-visual workshop and jam session.', '2025-09-25', '19:00:00', '21:00:00', 'Optional', 'Multipurpose Hall', NULL, NULL, 0, 1, TRUE),
('SUTDio Session', 'Creative audio-visual workshop and jam session.', '2025-10-09', '19:00:00', '22:00:00', 'Optional', 'Multipurpose Hall', NULL, NULL, 0, 1, TRUE),
('NihonGO! Japanese Club Meeting', 'Japanese language and culture practice session.', '2025-09-17', '19:00:00', '21:00:00', 'Optional', 'Room 4.101', NULL, NULL, 0, 1, TRUE),
('NihonGO! Japanese Club Meeting', 'Japanese language and culture practice session.', '2025-10-01', '19:00:00', '21:00:00', 'Optional', 'Room 4.101', NULL, NULL, 0, 1, TRUE),
('Dev & Dice Meetup', 'Casual board-gaming session for all enthusiasts.', '2025-09-30', '19:00:00', '21:00:00', 'Optional', 'Room 2.202', NULL, NULL, 0, 1, TRUE),
('Archery Club Recreational Session', 'Beginner‐friendly archery practice and recruitment.', '2025-09-17', '18:00:00', '20:00:00', 'Optional', 'Archery Range', NULL, NULL, 0, 1, TRUE),
('Archery Club Recreational Session', 'Beginner‐friendly archery practice and recruitment.', '2025-09-24', '18:00:00', '20:00:00', 'Optional', 'Archery Range', NULL, NULL, 0, 1, TRUE),
('Archery Club Recreational Session', 'Beginner‐friendly archery practice and recruitment.', '2025-10-01', '18:00:00', '20:00:00', 'Optional', 'Archery Range', NULL, NULL, 0, 1, TRUE),
('Archery Club Recreational Session', 'Beginner‐friendly archery practice and recruitment.', '2025-10-08', '18:00:00', '20:00:00', 'Optional', 'Archery Range', NULL, NULL, 0, 1, TRUE),
('Archery Club Competitive Session', 'Advanced archery drills for prospective competitive members.', '2025-09-16', '18:00:00', '22:00:00', 'Optional', 'Archery Classroom', NULL, NULL, 0, 1, TRUE),
('Archery Club Competitive Session', 'Advanced archery drills for prospective competitive members.', '2025-09-19', '18:00:00', '22:00:00', 'Optional', 'Archery Classroom', NULL, NULL, 0, 1, TRUE),
('Archery Club Competitive Session', 'Advanced archery drills for prospective competitive members.', '2025-09-23', '18:00:00', '22:00:00', 'Optional', 'Archery Classroom', NULL, NULL, 0, 1, TRUE),
('Archery Club Competitive Session', 'Advanced archery drills for prospective competitive members.', '2025-09-26', '18:00:00', '22:00:00', 'Optional', 'Archery Classroom', NULL, NULL, 0, 1, TRUE),
('Archery Club Competitive Session', 'Advanced archery drills for prospective competitive members.', '2025-09-30', '18:00:00', '22:00:00', 'Optional', 'Archery Classroom', NULL, NULL, 0, 1, TRUE),
('Archery Club Competitive Session', 'Advanced archery drills for prospective competitive members.', '2025-10-03', '18:00:00', '22:00:00', 'Optional', 'Archery Classroom', NULL, NULL, 0, 1, TRUE),
('Archery Club Competitive Session', 'Advanced archery drills for prospective competitive members.', '2025-10-07', '18:00:00', '22:00:00', 'Optional', 'Archery Classroom', NULL, NULL, 0, 1, TRUE),
('Archery Club Competitive Session', 'Advanced archery drills for prospective competitive members.', '2025-10-10', '18:00:00', '22:00:00', 'Optional', 'Archery Classroom', NULL, NULL, 0, 1, TRUE),
('SOAR Workshop', 'Hands-on robotics project workshop by SOAR.', '2025-10-01', '14:00:00', '17:00:00', 'Optional', 'Robotics Lab', NULL, NULL, 0, 1, TRUE),
('Gunpla Model Build', 'Gunpla assembly workshop for hobbyists.', '2025-09-24', '14:00:00', '16:00:00', 'Optional', 'Workshop Room', NULL, NULL, 0, 1, TRUE),
('EV Club Meeting', 'Discussion and demo of electric vehicle projects.', '2025-10-08', '14:00:00', '16:30:00', 'Optional', 'Engineering Lab', NULL, NULL, 0, 1, TRUE),
('Bands: Picnic at the Disco (Crew Workshop)', 'Full-day crew workshop for Picnic at the Disco.', '2025-10-01', '11:00:00', '22:00:00', 'Optional', 'Music Studio', NULL, NULL, 0, 1, TRUE),
('Bands: Camp Rock', 'Full-day rehearsals and performances for Camp Rock.', '2025-10-03', '15:00:00', '22:00:00', 'Optional', 'Music Studio', NULL, NULL, 0, 1, TRUE),
('Bands: Camp Rock', 'Full-day rehearsals and performances for Camp Rock.', '2025-10-04', '09:00:00', '22:00:00', 'Optional', 'Music Studio', NULL, NULL, 0, 1, TRUE),
('Bands: Instrument Workshop', 'Daily instrument skill workshops.', '2025-09-22', '19:00:00', '21:00:00', 'Optional', 'Music Studio', NULL, NULL, 0, 1, TRUE),
('Bands: Instrument Workshop', 'Daily instrument skill workshops.', '2025-09-23', '19:00:00', '21:00:00', 'Optional', 'Music Studio', NULL, NULL, 0, 1, TRUE),
('Bands: Instrument Workshop', 'Daily instrument skill workshops.', '2025-09-24', '19:00:00', '21:00:00', 'Optional', 'Music Studio', NULL, NULL, 0, 1, TRUE),
('Bands: Instrument Workshop', 'Daily instrument skill workshops.', '2025-09-25', '19:00:00', '21:00:00', 'Optional', 'Music Studio', NULL, NULL, 0, 1, TRUE),
('Bands: Instrument Workshop', 'Daily instrument skill workshops.', '2025-09-26', '19:00:00', '21:00:00', 'Optional', 'Music Studio', NULL, NULL, 0, 1, TRUE),
('Bands: Instrument Workshop', 'Daily instrument skill workshops.', '2025-09-29', '19:00:00', '21:00:00', 'Optional', 'Music Studio', NULL, NULL, 0, 1, TRUE),
('Bands: Instrument Workshop', 'Daily instrument skill workshops.', '2025-09-30', '19:00:00', '21:00:00', 'Optional', 'Music Studio', NULL, NULL, 0, 1, TRUE),
('IEEE x IES Interest Group Meeting', 'Introduction to IEEE and IES collaborative initiatives.', '2025-09-19', '13:00:00', '15:00:00', 'Optional', 'Engineering Seminar Room', NULL, NULL, 0, 1, TRUE),
('Gunpla Club x Mechanical Designer Club Workshop', 'Joint session on model design and assembly techniques.', '2025-09-24', '14:00:00', '16:00:00', 'Optional', 'Design Lab', NULL, NULL, 0, 1, TRUE),
('Chinese Culture Club Introduction', 'Overview of club activities and cultural workshops.', '2025-09-17', '19:00:00', '21:00:00', 'Optional', 'Cultural Centre Room A', NULL, NULL, 0, 1, TRUE),
('Chinese Culture Club Workshop', 'Cultural workshops and interactive sessions.', '2025-09-19', '19:00:00', '21:00:00', 'Optional', 'Cultural Centre Room A', NULL, NULL, 0, 1, TRUE),
('Chinese Culture Club Workshop', 'Cultural workshops and interactive sessions.', '2025-09-21', '19:00:00', '21:00:00', 'Optional', 'Cultural Centre Room A', NULL, NULL, 0, 1, TRUE),
('Chinese Culture Club Workshop', 'Cultural workshops and interactive sessions.', '2025-09-23', '19:00:00', '21:00:00', 'Optional', 'Cultural Centre Room A', NULL, NULL, 0, 1, TRUE),
('Chinese Culture Club Workshop', 'Cultural workshops and interactive sessions.', '2025-09-25', '19:00:00', '21:00:00', 'Optional', 'Cultural Centre Room A', NULL, NULL, 0, 1, TRUE),
('SUTD AI Interest Group Session', 'Discussion on AI trends and projects.', '2025-09-30', '19:00:00', '20:30:00', 'Optional', 'AI Lab', NULL, NULL, 0, 1, TRUE),
('Table Tennis Club Open Play', 'Casual table tennis session for all skill levels.', '2025-09-15', '19:00:00', '22:00:00', 'Optional', 'Sports Hall', NULL, NULL, 0, 1, TRUE),
('XR Community Interest Group Meetup', 'Exploration of XR technologies and demos.', '2025-10-01', '19:00:00', '21:00:00', 'Optional', 'VR Lab', NULL, NULL, 0, 1, TRUE),
('Chambers Ensemble Rehearsal', 'Chamber music rehearsal for ensemble members.', '2025-09-24', '19:30:00', '21:30:00', 'Optional', 'Music Room', NULL, NULL, 0, 1, TRUE),
('FUNKtion Dance Session', 'Funk dance workshop for members.', '2025-09-15', '19:00:00', '20:30:00', 'Optional', 'Dance Studio', NULL, NULL, 0, 1, TRUE),
('FUNKtion Dance Session', 'Funk dance workshop for members.', '2025-09-18', '19:00:00', '20:30:00', 'Optional', 'Dance Studio', NULL, NULL, 0, 1, TRUE),
('FUNKtion Dance Session', 'Funk dance workshop for members.', '2025-09-22', '19:00:00', '20:30:00', 'Optional', 'Dance Studio', NULL, NULL, 0, 1, TRUE),
('FUNKtion Dance Session', 'Funk dance workshop for members.', '2025-09-25', '19:00:00', '20:30:00', 'Optional', 'Dance Studio', NULL, NULL, 0, 1, TRUE),
('FUNKtion Dance Session', 'Funk dance workshop for members.', '2025-09-29', '19:00:00', '20:30:00', 'Optional', 'Dance Studio', NULL, NULL, 0, 1, TRUE),
('FUNKtion Dance Session', 'Funk dance workshop for members.', '2025-10-02', '19:00:00', '20:30:00', 'Optional', 'Dance Studio', NULL, NULL, 0, 1, TRUE),
('FUNKtion Dance Session', 'Funk dance workshop for members.', '2025-10-06', '19:00:00', '20:30:00', 'Optional', 'Dance Studio', NULL, NULL, 0, 1, TRUE),
('FUNKtion Dance Session', 'Funk dance workshop for members.', '2025-10-09', '20:30:00', '22:00:00', 'Optional', 'Dance Studio', NULL, NULL, 0, 1, TRUE),
('SUTD Judo Practice', 'Weekly judo training sessions.', '2025-09-16', '19:30:00', '21:00:00', 'Optional', 'Martial Arts Dojo', NULL, NULL, 0, 1, TRUE),
('SUTD Judo Practice', 'Weekly judo training sessions.', '2025-09-18', '19:30:00', '21:00:00', 'Optional', 'Martial Arts Dojo', NULL, NULL, 0, 1, TRUE),
('SUTD Judo Practice', 'Weekly judo training sessions.', '2025-09-23', '19:30:00', '21:00:00', 'Optional', 'Martial Arts Dojo', NULL, NULL, 0, 1, TRUE),
('SUTD Judo Practice', 'Weekly judo training sessions.', '2025-09-25', '19:30:00', '21:00:00', 'Optional', 'Martial Arts Dojo', NULL, NULL, 0, 1, TRUE),
('Climbing Club Session', 'Climbing wall session for members.', '2025-09-18', '19:00:00', '21:00:00', 'Optional', 'Climbing Wall', NULL, NULL, 0, 1, TRUE),
('Climbing Club Session', 'Climbing wall session for members.', '2025-09-25', '19:00:00', '21:00:00', 'Optional', 'Climbing Wall', NULL, NULL, 0, 1, TRUE),
('Cuesports Club Meet', 'Cuesports practice and friendly matches.', '2025-09-18', '14:00:00', '16:00:00', 'Optional', 'Recreation Room', NULL, NULL, 0, 1, TRUE),
('Volleyball SUTD Session', 'Volleyball practice games.', '2025-10-07', '19:00:00', '23:00:00', 'Optional', 'Sports Hall', NULL, NULL, 0, 1, TRUE),
('Volleyball SUTD Session', 'Volleyball practice games.', '2025-10-10', '19:00:00', '23:00:00', 'Optional', 'Sports Hall', NULL, NULL, 0, 1, TRUE),
('Energy Club Meetup', 'Discussion on energy projects and technologies.', '2025-10-01', '14:30:00', '16:30:00', 'Optional', 'Sustainable Tech Centre', NULL, NULL, 0, 1, TRUE),
('APEX Workshop', 'Introductory session on APEX platform.', '2025-09-17', '14:00:00', '16:00:00', 'Optional', 'Innovation Lab', NULL, NULL, 0, 1, TRUE),
('Touch Football Session', 'Touch football practice game.', '2025-09-15', '19:30:00', '22:30:00', 'Optional', 'Outdoor Field', NULL, NULL, 0, 1, TRUE),
('Touch Football Session', 'Touch football practice game.', '2025-09-22', '19:30:00', '22:30:00', 'Optional', 'Outdoor Field', NULL, NULL, 0, 1, TRUE),
('Mechanical Keyboard Interest Group', 'Workshop on custom mech keyboard assembly.', '2025-09-15', '19:00:00', '20:30:00', 'Optional', 'Electronics Lab', NULL, NULL, 0, 1, TRUE),
('Mechanical Keyboard Interest Group', 'Workshop on custom mech keyboard assembly.', '2025-09-23', '19:00:00', '20:30:00', 'Optional', 'Electronics Lab', NULL, NULL, 0, 1, TRUE),
('Wind Ensemble Rehearsal', 'Wind ensemble practice session.', '2025-09-16', '19:30:00', '21:30:00', 'Optional', 'Music Room', NULL, NULL, 0, 1, TRUE),
('Wind Ensemble Rehearsal', 'Wind ensemble practice session.', '2025-09-18', '19:30:00', '21:30:00', 'Optional', 'Music Room', NULL, NULL, 0, 1, TRUE),
('Wind Ensemble Rehearsal', 'Wind ensemble practice session.', '2025-09-23', '19:30:00', '21:30:00', 'Optional', 'Music Room', NULL, NULL, 0, 1, TRUE),
('Wind Ensemble Rehearsal', 'Wind ensemble practice session.', '2025-09-25', '19:30:00', '21:30:00', 'Optional', 'Music Room', NULL, NULL, 0, 1, TRUE),
('Wind Ensemble Rehearsal', 'Wind ensemble practice session.', '2025-09-30', '19:30:00', '21:30:00', 'Optional', 'Music Room', NULL, NULL, 0, 1, TRUE),
('Wind Ensemble Rehearsal', 'Wind ensemble practice session.', '2025-10-02', '19:30:00', '21:30:00', 'Optional', 'Music Room', NULL, NULL, 0, 1, TRUE),
('Wind Ensemble Rehearsal', 'Wind ensemble practice session.', '2025-10-07', '19:30:00', '21:30:00', 'Optional', 'Music Room', NULL, NULL, 0, 1, TRUE),
('Wind Ensemble Rehearsal', 'Wind ensemble practice session.', '2025-10-09', '19:30:00', '21:30:00', 'Optional', 'Music Room', NULL, NULL, 0, 1, TRUE),
('SEVEN Telegram Bot Workshop', 'Hands-on workshop building a Telegram bot.', '2025-09-17', '14:00:00', '17:00:00', 'Optional', 'Hack Lab', NULL, NULL, 0, 1, TRUE),
('SEVEN Hackathon Day', 'Day-long hackathon for project development.', '2025-09-19', '14:00:00', '18:00:00', 'Optional', 'Innovation Workspace', NULL, NULL, 0, 1, TRUE),
('SEVEN Art of Design Workshop', 'Creative design thinking session.', '2025-10-01', '14:00:00', '18:00:00', 'Optional', 'Design Studio', NULL, NULL, 0, 1, TRUE),
('SEVEN Talk with Founders & VIE', 'Talk by SUTD founders and venture fund overview.', '2025-10-03', '14:00:00', '18:00:00', 'Optional', 'Lecture Theatre 2', NULL, NULL, 0, 1, TRUE),
('Swimming Club Session', 'Lap swimming practice for all members.', '2025-09-15', '18:00:00', '20:00:00', 'Optional', 'Swimming Pool', NULL, NULL, 0, 1, TRUE),
('Swimming Club Session', 'Lap swimming practice for all members.', '2025-09-22', '18:00:00', '20:00:00', 'Optional', 'Swimming Pool', NULL, NULL, 0, 1, TRUE),
('Swimming Club Session', 'Lap swimming practice for all members.', '2025-09-29', '18:00:00', '20:00:00', 'Optional', 'Swimming Pool', NULL, NULL, 0, 1, TRUE),
('Swimming Club Session', 'Lap swimming practice for all members.', '2025-09-17', '18:00:00', '20:00:00', 'Optional', 'Swimming Pool', NULL, NULL, 0, 1, TRUE),
('Swimming Club Session', 'Lap swimming practice for all members.', '2025-09-24', '18:00:00', '20:00:00', 'Optional', 'Swimming Pool', NULL, NULL, 0, 1, TRUE),
('Swimming Club Session', 'Lap swimming practice for all members.', '2025-10-01', '18:00:00', '20:00:00', 'Optional', 'Swimming Pool', NULL, NULL, 0, 1, TRUE),
('Chinese Orchestra Club Rehearsal', 'Traditional orchestra practice session.', '2025-09-15', '19:30:00', '21:30:00', 'Optional', 'Orchestra Room', NULL, NULL, 0, 1, TRUE),
('Chinese Orchestra Club Rehearsal', 'Traditional orchestra practice session.', '2025-09-16', '11:00:00', '17:00:00', 'Optional', 'Orchestra Room', NULL, NULL, 0, 1, TRUE),
('Chinese Orchestra Club Rehearsal', 'Traditional orchestra practice session.', '2025-09-18', '19:30:00', '21:30:00', 'Optional', 'Orchestra Room', NULL, NULL, 0, 1, TRUE),
('Chinese Orchestra Club Rehearsal', 'Traditional orchestra practice session.', '2025-09-22', '19:30:00', '21:30:00', 'Optional', 'Orchestra Room', NULL, NULL, 0, 1, TRUE),
('Chinese Orchestra Club Rehearsal', 'Traditional orchestra practice session.', '2025-09-23', '19:30:00', '21:30:00', 'Optional', 'Orchestra Room', NULL, NULL, 0, 1, TRUE),
('Chinese Orchestra Club Marathon Rehearsal', 'Extended rehearsal and workshop day.', '2025-09-20', '11:00:00', '17:00:00', 'Optional', 'Orchestra Room', NULL, NULL, 0, 1, TRUE),
('Scratch Programming Workshop', 'Introductory Scratch coding sessions (Mon–Fri).', '2025-09-15', '19:00:00', '20:30:00', 'Optional', 'Computer Lab', NULL, NULL, 0, 1, TRUE),
('Scratch Programming Workshop', 'Introductory Scratch coding sessions (Mon–Fri).', '2025-09-16', '19:00:00', '20:30:00', 'Optional', 'Computer Lab', NULL, NULL, 0, 1, TRUE),
('Scratch Programming Workshop', 'Introductory Scratch coding sessions (Mon–Fri).', '2025-09-17', '19:00:00', '20:30:00', 'Optional', 'Computer Lab', NULL, NULL, 0, 1, TRUE),
('Scratch Programming Workshop', 'Introductory Scratch coding sessions (Mon–Fri).', '2025-09-18', '19:00:00', '20:30:00', 'Optional', 'Computer Lab', NULL, NULL, 0, 1, TRUE),
('Scratch Programming Workshop', 'Introductory Scratch coding sessions (Mon–Fri).', '2025-09-19', '19:00:00', '20:30:00', 'Optional', 'Computer Lab', NULL, NULL, 0, 1, TRUE),
('Cycling Interest Group Ride', 'Evening cycling meet-up and group ride.', '2025-09-18', '19:00:00', '20:30:00', 'Optional', 'Campus Entrance', NULL, NULL, 0, 1, TRUE),
('Vertex (Cheerleading) Club Practice', 'Cheerleading practice sessions.', '2025-09-15', '20:00:00', '22:30:00', 'Optional', 'Sports Hall', NULL, NULL, 0, 1, TRUE),
('Vertex (Cheerleading) Club Practice', 'Cheerleading practice sessions.', '2025-09-17', '20:00:00', '22:30:00', 'Optional', 'Sports Hall', NULL, NULL, 0, 1, TRUE),
('Vertex (Cheerleading) Club Practice', 'Cheerleading practice sessions.', '2025-09-22', '20:00:00', '22:30:00', 'Optional', 'Sports Hall', NULL, NULL, 0, 1, TRUE),
('Vertex (Cheerleading) Club Practice', 'Cheerleading practice sessions.', '2025-09-24', '20:00:00', '22:30:00', 'Optional', 'Sports Hall', NULL, NULL, 0, 1, TRUE),
('Vertex (Cheerleading) Club Practice', 'Cheerleading practice sessions.', '2025-09-29', '20:00:00', '22:30:00', 'Optional', 'Sports Hall', NULL, NULL, 0, 1, TRUE),
('Vertex (Cheerleading) Club Practice', 'Cheerleading practice sessions.', '2025-10-01', '20:00:00', '22:30:00', 'Optional', 'Sports Hall', NULL, NULL, 0, 1, TRUE),
('Vertex (Cheerleading) Club Practice', 'Cheerleading practice sessions.', '2025-10-08', '20:00:00', '22:30:00', 'Optional', 'Sports Hall', NULL, NULL, 0, 1, TRUE),
('SUTD Christian Fellowship Intro Session', 'Fellowship introduction and dinner with Freshmores.', '2025-09-16', '18:45:00', '21:00:00', 'Optional', 'Fellowship Hall', NULL, NULL, 0, 1, TRUE),
('SUTD Christian Fellowship Club Meeting', 'First club meeting with Freshmores and dinner.', '2025-09-23', '18:45:00', '21:00:00', 'Optional', 'Fellowship Hall', NULL, NULL, 0, 1, TRUE),
('SUTD Christian Fellowship BBQ', 'Outdoor BBQ gathering for fellowship members.', '2025-10-03', '18:00:00', '20:00:00', 'Optional', 'Outdoor Plaza', NULL, NULL, 0, 1, TRUE),
('Computer Enthusiasts Interest Group Discussion', 'Planning meeting post-compulsory briefings.', '2025-09-17', '15:00:00', '17:00:00', 'Pending', 'Innovation Lab', NULL, NULL, 0, 1, TRUE),
('Chess Club Match', 'Casual chess matches and strategy discussion.', '2025-09-19', '15:00:00', '17:00:00', 'Optional', 'Game Room', NULL, NULL, 0, 1, TRUE),
('Tamil Cultural Club Session', 'Tamil culture presentations and workshops.', '2025-10-02', '18:30:00', '21:30:00', 'Optional', 'Cultural Centre Room B', NULL, NULL, 0, 1, TRUE),
('Visual Arts Club Workshop', 'Art workshop and Q&A about club activities.', '2025-09-24', '14:00:00', '15:30:00', 'Optional', 'Art Studio', NULL, NULL, 0, 1, TRUE),
('Grub Ig and KLEC Meetup', 'Foodie exploration meet-up.', '2025-10-01', '18:00:00', '19:30:00', 'Optional', 'Food Court', NULL, NULL, 0, 1, TRUE),
('Grub Ig and KLEC Meetup', 'Foodie exploration meet-up.', '2025-10-08', '18:00:00', '19:30:00', 'Optional', 'Food Court', NULL, NULL, 0, 1, TRUE),
('Makerspace Club Workshop', 'Hands-on makerspace projects (tentative).', '2025-09-28', '15:00:00', '17:00:00', 'Optional', 'Makerspace', NULL, NULL, 0, 1, TRUE),
('Makerspace Club Workshop', 'Hands-on makerspace projects (tentative).', '2025-09-29', '15:00:00', '17:00:00', 'Optional', 'Makerspace', NULL, NULL, 0, 1, TRUE),
('Makerspace Club Workshop', 'Hands-on makerspace projects (tentative).', '2025-09-30', '15:00:00', '17:00:00', 'Optional', 'Makerspace', NULL, NULL, 0, 1, TRUE),
('Makerspace Club Workshop', 'Hands-on makerspace projects.', '2025-10-09', '15:00:00', '17:00:00', 'Optional', 'Makerspace', NULL, NULL, 0, 1, TRUE),
('Marketwatch Club Trading Session', 'Weekend trading rounds and discussion.', '2025-09-27', '14:00:00', '17:00:00', 'Optional', 'Finance Lab', NULL, NULL, 0, 1, TRUE),
('SUTD Productions Event', 'Production meeting and project showcase.', '2025-09-22', '00:00:00', '23:59:00', 'Optional', 'Studio', NULL, NULL, 0, 1, TRUE),
('Esports Club Practice', 'Regular esports practice sessions.', '2025-09-16', '19:00:00', '22:30:00', 'Optional', 'Gaming Lab', NULL, NULL, 0, 1, TRUE),
('Esports Club Practice', 'Regular esports practice sessions.', '2025-09-18', '19:00:00', '22:30:00', 'Optional', 'Gaming Lab', NULL, NULL, 0, 1, TRUE),
('Esports Club Practice', 'Regular esports practice sessions.', '2025-09-23', '19:00:00', '22:30:00', 'Optional', 'Gaming Lab', NULL, NULL, 0, 1, TRUE),
('Esports Club Practice', 'Regular esports practice sessions.', '2025-09-25', '19:00:00', '22:30:00', 'Optional', 'Gaming Lab', NULL, NULL, 0, 1, TRUE),
('Esports Club Practice', 'Regular esports practice sessions.', '2025-09-30', '19:00:00', '22:30:00', 'Optional', 'Gaming Lab', NULL, NULL, 0, 1, TRUE),
('Esports Club Practice', 'Regular esports practice sessions.', '2025-10-02', '19:00:00', '22:30:00', 'Optional', 'Gaming Lab', NULL, NULL, 0, 1, TRUE),
('Esports Club Practice', 'Regular esports practice sessions.', '2025-10-07', '19:00:00', '22:30:00', 'Optional', 'Gaming Lab', NULL, NULL, 0, 1, TRUE),
('Esports Club Practice', 'Regular esports practice sessions.', '2025-10-09', '19:00:00', '22:30:00', 'Optional', 'Gaming Lab', NULL, NULL, 0, 1, TRUE),
('Multi Rotor SUTD Session', 'TBC session for multirotor UAV enthusiasts.', '2025-10-10', '00:00:00', '00:00:00', 'Pending', 'Drone Lab', NULL, NULL, 0, 1, TRUE),
('Muay Thai Training', 'Muay Thai techniques and sparring.', '2025-09-15', '19:00:00', '21:00:00', 'Optional', 'Martial Arts Dojo', NULL, NULL, 0, 1, TRUE),
('Muay Thai Training', 'Muay Thai techniques and sparring.', '2025-09-17', '17:00:00', '19:00:00', 'Optional', 'Martial Arts Dojo', NULL, NULL, 0, 1, TRUE),
('Muay Thai Training', 'Muay Thai techniques and sparring.', '2025-09-19', '17:00:00', '19:00:00', 'Optional', 'Martial Arts Dojo', NULL, NULL, 0, 1, TRUE),
('Tortured Poets Interest Group Meeting', 'Poetry writing and critique session.', '2025-09-30', '19:00:00', '21:00:00', 'Optional', 'Literature Lounge', NULL, NULL, 0, 1, TRUE),
('Crochet Interest Group Session', 'Beginner crochet workshop.', '2025-09-16', '17:00:00', '19:00:00', 'Optional', 'Craft Room', NULL, NULL, 0, 1, TRUE),
('Crochet Interest Group Session', 'Beginner crochet workshop.', '2025-09-17', '17:00:00', '19:00:00', 'Optional', 'Craft Room', NULL, NULL, 0, 1, TRUE),
('Karate Interest Group Training', 'Karate basics and kata practice.', '2025-09-18', '20:00:00', '21:30:00', 'Optional', 'Martial Arts Dojo', NULL, NULL, 0, 1, TRUE),
('SUTD Uni-Y Club Intro Session', 'Introductory meet-up for Uni-Y club (TBC).', '2025-09-17', '14:00:00', '16:00:00', 'Pending', 'Community Room', NULL, NULL, 0, 1, TRUE),
('Vocomotives Music Jam', 'Live jam sessions for club members.', '2025-09-16', '20:00:00', '22:00:00', 'Optional', 'Music Studio', NULL, NULL, 0, 1, TRUE),
('Vocomotives Music Jam', 'Live jam sessions for club members.', '2025-09-23', '20:00:00', '22:00:00', 'Optional', 'Music Studio', NULL, NULL, 0, 1, TRUE),
('Vocomotives Music Jam', 'Live jam sessions for club members.', '2025-09-30', '20:00:00', '22:00:00', 'Optional', 'Music Studio', NULL, NULL, 0, 1, TRUE),
('Vocomotives Music Jam', 'Live jam sessions for club members.', '2025-10-07', '20:00:00', '22:00:00', 'Optional', 'Music Studio', NULL, NULL, 0, 1, TRUE),
('Writer''s Block Meetup', 'Creative writing workshop and peer review.', '2025-10-01', '19:00:00', '21:30:00', 'Optional', 'Literature Lounge', NULL, NULL, 0, 1, TRUE),
('SUTKD Karate & Krav Maga', 'Martial arts training sessions.', '2025-09-15', '19:00:00', '21:00:00', 'Optional', 'Martial Arts Dojo', NULL, NULL, 0, 1, TRUE),
('SUTKD Karate & Krav Maga', 'Martial arts training sessions.', '2025-09-17', '19:00:00', '21:00:00', 'Optional', 'Martial Arts Dojo', NULL, NULL, 0, 1, TRUE),
('SUTKD Karate & Krav Maga', 'Martial arts training sessions.', '2025-09-22', '19:00:00', '21:00:00', 'Optional', 'Martial Arts Dojo', NULL, NULL, 0, 1, TRUE),
('SUTKD Karate & Krav Maga', 'Martial arts training sessions.', '2025-09-24', '19:00:00', '21:00:00', 'Optional', 'Martial Arts Dojo', NULL, NULL, 0, 1, TRUE),
('SUTKD Karate & Krav Maga', 'Martial arts training sessions.', '2025-09-29', '19:00:00', '21:00:00', 'Optional', 'Martial Arts Dojo', NULL, NULL, 0, 1, TRUE),
('SUTKD Karate & Krav Maga', 'Martial arts training sessions.', '2025-10-01', '19:00:00', '21:00:00', 'Optional', 'Martial Arts Dojo', NULL, NULL, 0, 1, TRUE),
('Namaste Indian Cultural IG Session', 'Indian cultural activities and performances (tentative).', '2025-09-19', '20:00:00', '22:00:00', 'Optional', 'Cultural Centre Room C', NULL, NULL, 0, 1, TRUE),
('Space Bar Workshop', 'Space-themed workshop and competition.', '2025-09-24', '15:00:00', '17:00:00', 'Optional', 'Innovation Lab', NULL, NULL, 0, 1, TRUE),
('Space Bar Workshop', 'Space-themed workshop and competition.', '2025-10-01', '15:00:00', '17:00:00', 'Optional', 'Innovation Lab', NULL, NULL, 0, 1, TRUE),
('Space Bar Competition', 'Space bar competition event.', '2025-10-08', '15:00:00', '17:00:00', 'Optional', 'Innovation Lab', NULL, NULL, 0, 1, TRUE),
('Squash Club Match', 'Squash matches and practice drills.', '2025-09-16', '19:00:00', '22:00:00', 'Optional', 'Squash Courts', NULL, NULL, 0, 1, TRUE),
('Squash Club Match', 'Squash matches and practice drills.', '2025-09-23', '19:00:00', '22:00:00', 'Optional', 'Squash Courts', NULL, NULL, 0, 1, TRUE),
('Project Management Interest Group Meeting', 'Project management methodologies workshop.', '2025-09-25', '19:00:00', '21:00:00', 'Optional', 'Business Lab', NULL, NULL, 0, 1, TRUE),
('Project Management Interest Group Meeting', 'Project management methodologies workshop.', '2025-10-07', '19:00:00', '21:00:00', 'Optional', 'Business Lab', NULL, NULL, 0, 1, TRUE),
('Galois Group Session', 'Mathematics discussion group on algebra topics.', '2025-09-18', '20:00:00', '22:00:00', 'Optional', 'Math Department Room', NULL, NULL, 0, 1, TRUE),
('Floorball Club Game', 'Floorball practice matches.', '2025-09-24', '19:00:00', '22:30:00', 'Optional', 'Sports Hall', NULL, NULL, 0, 1, TRUE),
('Floorball Club Game', 'Floorball practice matches.', '2025-10-08', '19:00:00', '22:30:00', 'Optional', 'Sports Hall', NULL, NULL, 0, 1, TRUE),
('Greenprint Flower Workshop', 'Flower arrangement workshop.', '2025-09-18', '14:00:00', '15:00:00', 'Optional', 'Green Lab', NULL, NULL, 0, 1, TRUE),
('Greenprint Wax Workshop', 'Wax crafting workshop.', '2025-09-24', '14:00:00', '16:00:00', 'Optional', 'Green Lab', NULL, NULL, 0, 1, TRUE),
('Greenprint Flower Workshop', 'Flower arrangement workshop.', '2025-10-02', '19:00:00', '20:00:00', 'Optional', 'Green Lab', NULL, NULL, 0, 1, TRUE),
('Greenprint Wax Workshop', 'Wax crafting workshop.', '2025-10-08', '14:00:00', '16:00:00', 'Optional', 'Green Lab', NULL, NULL, 0, 1, TRUE),

-- Newly added events
('Freshmen Hostel briefing and Floor Gathering', 'Mandatory briefing for freshmen students and floor gathering session', '2025-09-09', '19:00:00', '21:30:00', 'Mandatory', 'Auditorium', '#C60003', NULL, 0, 1, TRUE),
('Mass Floor Events', 'Large-scale floor events across various venues', '2025-09-15', '19:00:00', '22:00:00', 'Mandatory', 'Various venues', '#C60003', NULL, 0, 1, TRUE),
('HG Info Session', 'Information session about HG (House Group)', '2025-09-17', '20:00:00', '21:00:00', 'Optional', 'Hostel Lounge', '#EF5800', NULL, 0, 1, TRUE),
('ROOT briefing', 'Information briefing about ROOT organization', '2025-09-24', '19:00:00', '20:00:00', 'Optional', 'Albert Hong', '#EF5800', NULL, 0, 1, TRUE),
('Student Relations briefing', 'Information session about Student Relations department', '2025-10-01', '19:00:00', '20:00:00', 'Optional', 'Root Cove', '#EF5800', NULL, 0, 1, TRUE),
('Media and Marketing briefing', 'Information session about Media and Marketing department', '2025-10-01', '19:00:00', '20:00:00', 'Optional', 'Root Cove', '#EF5800', NULL, 0, 1, TRUE),
('ROOTech briefing', 'Information session about ROOTech department', '2025-10-08', '19:00:00', '20:00:00', 'Optional', 'Root Cove', '#EF5800', NULL, 0, 1, TRUE),
('Events briefing', 'Information session about Events department', '2025-10-15', '19:00:00', '20:00:00', 'Optional', 'Root Cove', '#EF5800', NULL, 0, 1, TRUE),
('Finance briefing', 'Information session about Finance department', '2025-10-15', '19:00:00', '20:00:00', 'Optional', 'Root Cove', '#EF5800', NULL, 0, 1, TRUE),

-- Freshmen Orientation 2025 (3-day event)
('Freshmen Orientation 2025', 'Comprehensive orientation program for new freshmen students - Day 1', '2025-09-11', '08:00:00', '18:00:00', 'Mandatory', 'Campus-wide', '#C60003', NULL, 0, 1, TRUE),
('Freshmen Orientation 2025', 'Comprehensive orientation program for new freshmen students - Day 2', '2025-09-12', '08:00:00', '18:00:00', 'Mandatory', 'Campus-wide', '#C60003', NULL, 0, 1, TRUE),
('Freshmen Orientation 2025', 'Comprehensive orientation program for new freshmen students - Day 3', '2025-09-13', '08:00:00', '18:00:00', 'Mandatory', 'Campus-wide', '#C60003', NULL, 0, 1, TRUE),

-- What the Hack 2025 (3-day hackathon)
('What the Hack 2025', 'SUTD''s signature hackathon 2025 - Day 1', '2025-09-19', '08:00:00', '23:59:00', 'Optional', 'Campus-wide', '#EF5800', NULL, 0, 1, TRUE),
('What the Hack 2025', 'SUTD''s signature hackathon 2025 - Day 2', '2025-09-20', '08:00:00', '23:59:00', 'Optional', 'Campus-wide', '#EF5800', NULL, 0, 1, TRUE),
('What the Hack 2025', 'SUTD''s signature hackathon 2025 - Day 3', '2025-09-21', '08:00:00', '18:00:00', 'Optional', 'Campus-wide', '#EF5800', NULL, 0, 1, TRUE),

-- Freshmore Orientation 2025 Events
('Airport pickup & early check-in for International Students', 'Early check-in assistance for international students arriving at the airport', '2025-09-08', '00:00:00', '23:59:00', 'Optional', '', '#EF5800', NULL, 0, 1, TRUE),
('Hostel check-in for Local Students', 'Check-in process for local students moving into hostels', '2025-09-09', '00:00:00', '23:59:00', 'Optional', '', '#EF5800', NULL, 0, 1, TRUE),
('Hostel Briefing & Floor Gatherings', 'Mandatory briefing for hostel residents with floor gathering sessions', '2025-09-09', '19:00:00', '22:00:00', 'Mandatory', 'Lecture Theatre 1', '#C60003', NULL, 0, 1, TRUE),
('Welcome Briefing', 'Mandatory welcome briefing for all new students', '2025-09-10', '10:00:00', '12:00:00', 'Mandatory', 'Auditorium', '#C60003', NULL, 0, 1, TRUE),
('DIVE Briefing', 'Mandatory DIVE program briefing session', '2025-09-10', '13:00:00', '14:30:00', 'Mandatory', 'Auditorium', '#C60003', NULL, 0, 1, TRUE),
('Student Organisations Showcase', 'Mandatory showcase of student organizations and clubs', '2025-09-10', '14:30:00', '17:30:00', 'Mandatory', 'Indoor Sports Halls, Maker Breaker Space', '#C60003', NULL, 0, 1, TRUE),
('Drug Awareness & Prevention Talk', 'Mandatory drug awareness and prevention educational talk', '2025-09-10', '19:00:00', '21:00:00', 'Mandatory', 'Auditorium', '#C60003', NULL, 0, 1, TRUE),
('Academic Briefing', 'Mandatory academic briefing for all new students', '2025-09-15', '14:00:00', '16:00:00', 'Mandatory', 'Auditorium', '#C60003', NULL, 0, 1, TRUE),
('Hostel Floor Gatherings with Pillar Year Residents', 'Floor gatherings between new students and pillar year residents', '2025-09-15', '18:00:00', '20:00:00', 'Optional', '', '#EF5800', NULL, 0, 1, TRUE),
('English Proficiency Test (EWET)', 'English Proficiency Test for applicable students', '2025-09-16', '09:00:00', '17:00:00', 'Optional', '', '#EF5800', NULL, 0, 1, TRUE),
('Library Day', 'Library orientation and familiarization day', '2025-09-17', '11:00:00', '16:30:00', 'Optional', 'Library', '#EF5800', NULL, 0, 1, TRUE),
('Freshmen Inauguration Ceremony', 'Mandatory formal inauguration ceremony for all freshmen', '2025-09-17', '16:30:00', '18:00:00', 'Mandatory', 'Auditorium', '#C60003', NULL, 0, 1, TRUE),
('Freshmore-Faculty Networking Nite', 'Mandatory networking event between freshmen and faculty', '2025-09-17', '18:00:00', '21:00:00', 'Mandatory', 'Indoor Sports Halls', '#C60003', NULL, 0, 1, TRUE),
('Design Your Future: Discover ASD', 'Information session about Architecture and Sustainable Design pillar', '2025-09-19', '14:00:00', '16:00:00', 'Optional', 'ASD Studio 2 (1.617)', '#EF5800', NULL, 0, 1, TRUE),
('Library & Digital Competencies Workshop', 'Online workshop on library resources and digital competencies', '2025-09-23', '15:30:00', '17:30:00', 'Optional', 'Online Webinar', '#EF5800', NULL, 0, 1, TRUE),
('Internship Poster Showcase', 'Showcase of internship experiences and opportunities', '2025-09-26', '14:00:00', '17:00:00', 'Optional', 'Campus Centre Level 2 & Library', '#EF5800', NULL, 0, 1, TRUE),
('StartSomething Day 1', 'StartSomething entrepreneurship program - Day 1', '2025-09-27', '08:00:00', '18:00:00', 'Optional', '', '#EF5800', NULL, 0, 1, TRUE),
('StartSomething Day 2', 'StartSomething entrepreneurship program - Day 2', '2025-09-28', '08:00:00', '18:00:00', 'Optional', '', '#EF5800', NULL, 0, 1, TRUE),
('StartSomething Day 3', 'StartSomething entrepreneurship program - Day 3', '2025-09-29', '08:00:00', '18:00:00', 'Optional', '', '#EF5800', NULL, 0, 1, TRUE),
('StartSomething Day 4', 'StartSomething entrepreneurship program - Day 4', '2025-09-30', '08:00:00', '18:00:00', 'Optional', '', '#EF5800', NULL, 0, 1, TRUE),
('StartSomething Day 5', 'StartSomething entrepreneurship program - Day 5', '2025-10-01', '08:00:00', '18:00:00', 'Optional', '', '#EF5800', NULL, 0, 1, TRUE),
('StartSomething Day 6', 'StartSomething entrepreneurship program - Day 6', '2025-10-02', '08:00:00', '18:00:00', 'Optional', '', '#EF5800', NULL, 0, 1, TRUE),
('StartSomething Day 7', 'StartSomething entrepreneurship program - Day 7', '2025-10-03', '08:00:00', '18:00:00', 'Optional', '', '#EF5800', NULL, 0, 1, TRUE),
('StartSomething Day 8', 'StartSomething entrepreneurship program - Day 8', '2025-10-04', '08:00:00', '18:00:00', 'Optional', '', '#EF5800', NULL, 0, 1, TRUE),
('StartSomething Day 9', 'StartSomething entrepreneurship program - Day 9', '2025-10-05', '08:00:00', '18:00:00', 'Optional', '', '#EF5800', NULL, 0, 1, TRUE),
('StartSomething Day 10', 'StartSomething entrepreneurship program - Day 10', '2025-10-06', '08:00:00', '18:00:00', 'Optional', '', '#EF5800', NULL, 0, 1, TRUE),
('StartSomething Day 11', 'StartSomething entrepreneurship program - Day 11', '2025-10-07', '08:00:00', '18:00:00', 'Optional', '', '#EF5800', NULL, 0, 1, TRUE),
('StartSomething Day 12', 'StartSomething entrepreneurship program - Day 12', '2025-10-08', '08:00:00', '18:00:00', 'Optional', '', '#EF5800', NULL, 0, 1, TRUE),
-- Multi-day events for testing conflict resolution and spanning
('Tech Innovation Summit', 'Three-day technology and innovation summit covering AI, blockchain, and sustainability.', '2025-10-15', '09:00:00', '17:00:00', 'Optional', 'Campus-wide', '#8B5CF6', NULL, 0, 1, TRUE),
('Tech Innovation Summit', 'Three-day technology and innovation summit covering AI, blockchain, and sustainability.', '2025-10-16', '09:00:00', '17:00:00', 'Optional', 'Campus-wide', '#8B5CF6', NULL, 0, 1, TRUE),
('Tech Innovation Summit', 'Three-day technology and innovation summit covering AI, blockchain, and sustainability.', '2025-10-17', '09:00:00', '17:00:00', 'Optional', 'Campus-wide', '#8B5CF6', NULL, 0, 1, TRUE),
('Design Thinking Bootcamp', 'Intensive 2-day design thinking workshop for students.', '2025-10-22', '10:00:00', '16:00:00', 'Mandatory', 'Design Studios', '#C60003', NULL, 0, 1, TRUE),
('Design Thinking Bootcamp', 'Intensive 2-day design thinking workshop for students.', '2025-10-23', '10:00:00', '16:00:00', 'Mandatory', 'Design Studios', '#C60003', NULL, 0, 1, TRUE),
ON CONFLICT (title, event_date, start_time) DO NOTHING;

-- Update colors for events that have NULL colors based on their event type
UPDATE calendar_events 
SET color = CASE 
  WHEN event_type IN ('Mandatory', 'mandatory') THEN '#C60003'
  WHEN event_type IN ('Optional', 'optional', 'workshop', 'seminar', 'social', 'competition', 'networking') THEN '#EF5800'
  WHEN event_type IN ('Pending', 'pending') THEN '#F0DD59'
  ELSE '#EF5800'
END
WHERE color IS NULL;

-- Auto-signup all users for mandatory events
INSERT INTO event_signups (user_id, event_id, signup_date)
SELECT u.id, ce.id, CURRENT_TIMESTAMP
FROM users u
CROSS JOIN calendar_events ce
WHERE ce.event_type IN ('Mandatory', 'mandatory') 
  AND ce.is_active = true 
  AND u.is_active = true
ON CONFLICT (user_id, event_id) DO NOTHING;

-- Update participant counts for mandatory events
UPDATE calendar_events 
SET current_participants = (
  SELECT COUNT(*) 
  FROM event_signups es 
  WHERE es.event_id = calendar_events.id
)
WHERE event_type IN ('Mandatory', 'mandatory') AND is_active = true;

-- Insert survival kit data
INSERT INTO survival_kit_items (title, image_url, content, order_index) VALUES
('Connectivity &
Navigation', '/images/connectivity-navigation.png', 'SUTD provides multiple ways for students to connect to campus networks, access resources remotely, and find their way around.', 1),
('Academic &
Career Tools', '/images/academic-career.png', 'Access essential academic resources including course registration, grade portals, library services, and career development tools. Your one-stop guide for academic success at SUTD.', 2),
('Booking & Using
Campus Facilities', '/images/campus-facilities.png', 'Learn how to book and utilize campus facilities including study rooms, sports facilities, maker spaces, and event venues. Maximize your use of SUTD''s world-class facilities.', 3),
('Hostel Life', '/images/hostel-life.png', 'SUTD''s hostels provide on-campus living with communal spaces, events, and amenities. Staying connected with your floor community is essential for updates and meeting residency requirements.', 4),
('ROOT &
Student Services', '/images/root-student-services.png', 'ROOT is SUTD''s student government, supporting events, Fifth Row activities, student welfare, and community engagement. It also provides resources for organising events, managing finances, and connecting with fellow students.', 5),
('Health &
Safety', '/images/health-safety.png', 'Stay safe and healthy on campus with information about medical services, emergency procedures, mental health resources, and safety protocols. Your wellbeing is our priority.', 6),
('Food &
Supper Hacks', '/images/food.png', 'Discover the best food options on and around campus, late-night supper spots, food delivery hacks, and budget-friendly meal solutions. Never go hungry at SUTD!', 7),
('Finance &
Claims', '/images/finance-claims.png', 'Understand financial procedures, claim processes, scholarship information, and budget management tips. Make your money work smarter during your SUTD journey.', 8),
('Contacts &
Hotlines', '/images/contacts-hotlines.png', 'Essential contact information for all SUTD services, emergency hotlines, department contacts, and who to call when you need help. Keep these numbers handy!', 9),
('Extras &
Perks', '/images/extras-perks.png', 'Unlock hidden perks, student discounts, special programs, and lesser-known benefits available to SUTD students. Make the most of your student status!', 10)
ON CONFLICT DO NOTHING;

-- Insert survival kit resources for Connectivity & Navigation
INSERT INTO survival_kit_resources (survival_kit_item_id, title, description, order_index) VALUES
(1, 'WiFi Setup Guide', 'Log into SUTD_Wifi using your MyPortal credentials:
- Username: 100XXXX (Student ID)
- Password: (Network ID password)

Guides & Links:
- Eduroam setup PDF: https://www.sutd.edu.sg/cmsresource/it/eduroam_setup.pdf
- IT Service Desk Eduroam page: https://itservicedesk.sutd.edu.sg/index.php/2023/04/27/wireless-eduroam/', 1),
(1, 'VPN', 'Required to access certain SUTD resources when off-campus.
Steps:
1. Go to http://itservicedesk.sutd.edu.sg
2. Quick Links → Students → Student Downloads → ''2. General'' → ''8. Ivanti Secure Access''
3. Download and install Ivanti Secure Access for your device
4. Add connection:
   - Name: SUTD VPN connection
   - Server: https://sutdvpn.sutd.edu.sg/remote
5. Login with MyPortal credentials + Google Authenticator code

Guide: https://itservicedesk.sutd.edu.sg/index.php/2023/04/17/vpn-ivantisecureaccess-installation-guide/', 2),
(1, 'Campus Navigation', 'Tools:
- @SUTDMapBot on Telegram → Find any room by number
- 3D Campus Map (by students) → https://jingkai27.github.io/insight/#features', 3),
(1, 'Room Number Format', 'How to read:
- First digit = Building
- Second digit = Level
- Last digits = Room number
Example: 1.308 → Building 1, Level 3, Room 8', 4);

-- Insert survival kit resources for Academic & Career Tools
INSERT INTO survival_kit_resources (survival_kit_item_id, title, description, order_index) VALUES
(2, 'MyPortal', 'Official school portal for administrative matters including timetable, fee payment, and academic transcripts. Login: https://myportal.sutd.edu.sg/', 1),
(2, 'eDimension', 'Primary academic platform for lecture slides, homework submissions, quizzes, and online assessments. Login: https://edimension.sutd.edu.sg/', 2),
(2, 'SUTD Career Portal (GEMS)', 'One-stop career services system to apply for jobs, book career advisory appointments, and sign up for workshops or recruitment events. Login: https://sutd-csm.symplicity.com/', 3),
(2, 'Outlook Email', 'Official communication channel between students and the school. Email format: 100XXXX@mymail.sutd.edu.sg. Login: https://outlook.office.com/', 4),
(2, 'LockDown Browser', 'Secure browser used for accessing certain quizzes and exams on eDimension. Download: https://download.respondus.com/lockdown/download.php?id=935444133', 5),
(2, 'Other Academic Platforms', 'Additional tools used in some courses: Learning Catalytics, Ed Discussion, Piazza, Classpoint, and Gradescope.', 6);

-- Insert survival kit resources for Booking & Using Campus Facilities
INSERT INTO survival_kit_resources (survival_kit_item_id, title, description, order_index) VALUES
(3, 'FabLab Booking Portal', 'Book fabrication facilities like laser cutters and 3D printers after completing required training. Access via SUTD ED Booking Systems: https://edbooking.sutd.edu.sg/fablabbooking/Web/schedule.php?&sid=52', 1),
(3, 'Library Resources & Room Booking', 'Access electronic resources and book discussion rooms. Portal: https://mylibrary.sutd.edu.sg/', 2),
(3, 'IBMS Sports Booking', 'Book sports and recreation facilities. Email help-facilities@sutd.edu.sg for an account.', 3),
(3, 'Other Booking Platforms', 'Research Seating Management System and Academic Media Studio (training required) are also available for specific needs.', 4),
(3, 'Printing Facilities', 'Available at Hostel Quiet Rooms, Library, Pi Lab, and Plotter Room. Includes 2D/3D scanning and photocopying.', 5),
(3, 'Think Tanks & Study Spaces', 'Late Night Think Tank 21 (2.310) open daily 6:00 pm – 2:00 am.', 6),
(3, 'Sports & Recreation Centre', 'Includes swimming pool, gym, indoor and outdoor courts. Opening hours vary; check official schedules.', 7),
(3, 'Places to Chill', 'ROOT Cove (Building 2 Level 3) and Student Activity Centre (Building 5 Level 4) with board games, consoles, and lounge seating.', 8),
(3, 'Scrapyard', 'Student-initiated recycling space for unwanted but useful materials. Managed by Greenprint Club.', 9);

-- Insert survival kit resources for Hostel Life
INSERT INTO survival_kit_resources (survival_kit_item_id, title, description, order_index) VALUES
(4, 'Floor Chats & House Guardians', 'Join your floor''s chat group to receive updates on admin matters and events. Contact your floor''s House Guardian if you are not in the group.', 1),
(4, 'Housing Portal', 'Manage housing applications, request maintenance, and make housing payments: https://hms.sutd.edu.sg/studentportal/Default.aspx', 2),
(4, 'Aircon Credits', 'Top up and check aircon credits using credentials on your room access card. Telegram Bot: @evs_notification_bot', 3),
(4, 'Door Knob Battery', 'If the door knob light blinks faint blue, request a battery change via the Housing Portal to prevent lockouts.', 4),
(4, 'Board Games Bot', 'Rent board games from the hostel lounge. Weekdays: 7:30pm–11:30pm, Weekends: 10am–10pm. Telegram Bot: @SUTDbg_bot', 5),
(4, 'Visitor Registration', 'Register visitors (including SUTD students not staying in hostel) before bringing them in during hostel visiting hours.', 6);

-- Insert survival kit resources for ROOT & Student Services
INSERT INTO survival_kit_resources (survival_kit_item_id, title, description, order_index) VALUES
(5, 'ROOT Website', 'Find resources and guidelines for starting events, publicising activities, and managing Fifth Row clubs. Access: https://root.sutd.edu.sg/', 1),
(5, 'Fifth Row Directory', 'Explore all available Fifth Row clubs and communities: https://root.sutd.edu.sg/student-life/fifth-row-directory', 2),
(5, 'Event & Finance Resources', 'Download documents for events, finance, IT help, and other guidelines: https://root.sutd.edu.sg/resources', 3),
(5, 'Locker Booking', 'Book lockers for storing your items: https://root.sutd.edu.sg/locker-booking', 4),
(5, 'Community Platforms', 'SUTD Family Telegram group, Facebook group, Reddit, Discord, and niche interest groups (e.g., vegetarian/vegan chat, international students, HASS minor discussions).', 5),
(5, 'ROOT Feedback Bot', 'Voice your feedback and suggestions directly to ROOT via Telegram: @SUTD_ROOT_bot', 6),
(5, 'ROOT Announcements Channel', 'Receive important admin details and event updates from ROOT.', 7),
(5, 'ROOT Social Media', 'Instagram: https://www.instagram.com/sutdlife/ | YouTube: https://www.youtube.com/channel/UCWQAI3RDoz_-cPHHr_4thcQ', 8);

-- Insert survival kit resources for Health & Safety
INSERT INTO survival_kit_resources (survival_kit_item_id, title, description, order_index) VALUES
(6, 'Medical Coverage', 'All students are covered under the GroupCare Lite @Income insurance scheme. Sign up with your SUTD email (format: 100XXXX@mymail.sutd.edu.sg) and student ID.', 1),
(6, 'Nearest Clinics', 'Fullerton Health @ Watsons (Changi City Point) is closest; Central 24-HR Clinic (Tampines) for 24-hour service.', 2),
(6, 'Telemedicine Booth', 'Available 24/7 on campus near Albert Hong benches or next to Building 1 Lift.', 3),
(6, 'Leave of Absence (LOA)', 'For medical or approved personal reasons, inform your instructors and submit LOA via MyPortal > Self Service > Leave of Absence Application. Medical certificate required.', 4),
(6, 'Lost Student Card', 'Email help-facilities@sutd.edu.sg for a temporary access card ($10). FM Office is at Building 5 Level 1.', 5),
(6, 'Emergency Contacts', 'Campus Security (24/7): 6303 6666 | Hostel Security (24/7): 6499 4071', 6);

-- Insert survival kit resources for Food & Supper Hacks
INSERT INTO survival_kit_resources (survival_kit_item_id, title, description, order_index) VALUES
(7, 'Hungrysia Group', 'Telegram group for group-buy food orders and bulk delivery coordination. Current Boss: @S_jean', 1),
(7, 'Vegetarian/Vegan Chat', 'Telegram group for vegetarians and vegans to share meal options and food tips.', 2),
(7, 'Nearby Eats', 'Ananda Bhavan (vegetarian), Domino''s, Gomgom sandwiches, and the Indian stall (when open) are common go-tos.', 3),
(7, 'Late Night Snacks', 'Coordinate with peers for food runs or use group-buy chats to get deliveries during study sessions.', 4);

-- Insert survival kit resources for Finance & Claims
INSERT INTO survival_kit_resources (survival_kit_item_id, title, description, order_index) VALUES
(8, 'Grants, Bursaries & Scholarships', 'For enquiries, contact studentfinance@sutd.edu.sg or call 6303 6888.', 1),
(8, 'Student Claims (Clubs, Events, Projects)', 'Submit claims through Concur at https://www.concursolutions.com/nui/signin using your 100XXXX@mymail.sutd.edu.sg and EASE credentials.', 2),
(8, 'Finance Guidelines', 'Download the latest finance guidelines from ROOT''s resources page before making purchases: https://root.sutd.edu.sg/resources', 3),
(8, 'Approval & Clarifications', 'Seek confirmation from your StuOrg Treasurer before committing to any expenses to ensure they meet reimbursement requirements.', 4);

-- Insert survival kit resources for Contacts & Hotlines
INSERT INTO survival_kit_resources (survival_kit_item_id, title, description, order_index) VALUES
(9, 'IT Service Desk', 'Email help-it@sutd.edu.sg (24h) or call 6499 4500 (Mon–Fri: 8am–10pm, Sat: 8:30am–1pm). Walk-in: IT Care @ 2.204 (Building 2 Level 4).', 1),
(9, 'Educational Technology', 'Support for eDimension, online exams, course evaluation, Academic Media Studio, and more. Email edi_admin@sutd.edu.sg (Mon–Fri: 8:30am–5:30pm).', 2),
(9, 'Finance Enquiries', 'Email studentfinance@sutd.edu.sg or call 6303 6888.', 3),
(9, 'Campus Facilities', 'Call 6303 6699.', 4),
(9, 'Campus Security (24/7)', 'Call 6303 6666.', 5),
(9, 'Hostel Security (24/7)', 'Call 6499 4071.', 6),
(9, 'Hostel Communal Facilities', 'For issues like dryers, call 6434 8225.', 7);

-- Insert survival kit resources for Extras & Perks
INSERT INTO survival_kit_resources (survival_kit_item_id, title, description, order_index) VALUES
(10, 'Economist Subscription', 'Free access to The Economist app and newsletter using your SUTD email. Sign up: https://myaccount.economist.com/s/login/SelfRegister', 1),
(10, 'Self-Service Recording Studio', 'Located at SUTD Library Level 3. Book via https://mylibrary.sutd.edu.sg/bookable-room-dr-l3-32 or use Outlook links for video/audio studios.', 2),
(10, 'Word of Mouth Lobangs', 'polymate.tech for filament, fasteners, electronics, wires, and after-hours printing & laser services.', 3),
(10, 'Interesting 3D Prints', 'Download hostel wallet and card holder model by Joel, Class of 2025: https://www.printables.com/model/1009157-sutd-hostel-wallet-and-card-holder', 4),
(10, 'Study Tips', 'Write notes to improve retention, type notes to organise thoughts. Recommended apps: GoodNotes, Notability, OneNote, Notion (free education account).', 5),
(10, 'GitHub Education', 'Free suite of developer tools including GitHub Copilot. Remember to disable code-sharing permissions if required by your course.', 6);

-- Telegram Bot Tables and Schema

-- Create table to track reminder notifications sent
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

-- Comments for telegram bot tables
COMMENT ON COLUMN users.telegram_handle IS 'Optional Telegram handle for the user (without @)';
COMMENT ON COLUMN users.telegram_chat_id IS 'Telegram chat ID for sending bot notifications to users';
COMMENT ON TABLE reminder_notifications IS 'Tracks sent reminder notifications to prevent duplicates';
COMMENT ON COLUMN reminder_notifications.reminder_type IS 'Type of reminder sent (e.g., 30_min_before, 1_hour_before)';

-- Telegram bot functionality is now ready for use
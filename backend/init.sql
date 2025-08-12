-- Create users table with proper authentication fields (must be first due to foreign key references)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    student_id VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'student' CHECK (role IN ('admin', 'student')),
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
    password_reset_expires TIMESTAMP
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
CREATE INDEX IF NOT EXISTS idx_event_signups_user_id ON event_signups(user_id);
CREATE INDEX IF NOT EXISTS idx_event_signups_event_id ON event_signups(event_id);
CREATE INDEX IF NOT EXISTS idx_event_signups_signup_date ON event_signups(signup_date);

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

-- Insert admin users with password 'DSUTDadmin' (bcrypt hash)
-- Note: This is a bcrypt hash of 'DSUTDadmin' with salt rounds 10
INSERT INTO users (student_id, email, password_hash, role, email_verified, is_active) VALUES
('1007667', '1007667@mymail.sutd.edu.sg', '$2a$10$1z.67uf.usNl82d5.On6DeIehT8pIF0vYf5cw54ySVmaIm7NczfuO', 'admin', TRUE, TRUE),
('1007771', '1007771@mymail.sutd.edu.sg', '$2a$10$1z.67uf.usNl82d5.On6DeIehT8pIF0vYf5cw54ySVmaIm7NczfuO', 'admin', TRUE, TRUE),
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
('1008148', '1008148@mymail.sutd.edu.sg', '$2a$10$1z.67uf.usNl82d5.On6DeIehT8pIF0vYf5cw54ySVmaIm7NczfuO', 'admin', TRUE, TRUE)
ON CONFLICT (student_id) DO NOTHING;

-- Insert sample calendar events from seed-events.json
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
('What the Hack 2025', 'SUTD''s signature hackathon 2025 - Day 3', '2025-09-21', '08:00:00', '18:00:00', 'Optional', 'Campus-wide', '#EF5800', NULL, 0, 1, TRUE)
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
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
    color VARCHAR(16),
    max_participants INTEGER,
    current_participants INTEGER DEFAULT 0,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT TRUE,
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
    attended BOOLEAN DEFAULT FALSE,
    attendance_date TIMESTAMP,
    UNIQUE(user_id, event_id)
);

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
# Database Documentation

Complete database schema and management guide for the DSUTD2025 Student Portal.

## 📊 Database Overview

The application uses **PostgreSQL 15** with a comprehensive schema designed for user management, event handling, and security auditing.

- **Database Name**: `webapp_db`
- **User**: `webapp_user`
- **Port**: 5432
- **Container**: `webapp-postgres`

## 🗄️ Database Schema

### Core Tables

#### users
Primary user account table storing all user information.

```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    student_id VARCHAR(7) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'student' CHECK (role IN ('student', 'admin')),
    is_active BOOLEAN DEFAULT true,
    email_verified BOOLEAN DEFAULT false,
    email_verification_token VARCHAR(255),
    email_verification_expires TIMESTAMP,
    password_reset_token VARCHAR(255),
    password_reset_expires TIMESTAMP,
    password_changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    session_token_version INTEGER DEFAULT 1,
    failed_login_attempts INTEGER DEFAULT 0,
    account_locked_until TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Indexes:**
- Primary key on `id`
- Unique index on `student_id`
- Unique index on `email`
- Index on `role` for admin queries
- Index on `email_verification_token`
- Index on `password_reset_token`

#### calendar_events
Event management table for all system events.

```sql
CREATE TABLE calendar_events (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    event_date DATE NOT NULL,
    start_time TIME,
    end_time TIME,
    location VARCHAR(255),
    event_type VARCHAR(50) DEFAULT 'Optional',
    is_mandatory BOOLEAN DEFAULT false,
    color VARCHAR(7) DEFAULT '#3B82F6',
    max_participants INTEGER,
    current_participants INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    creator_user_id INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Indexes:**
- Primary key on `id`
- Index on `event_date` for date queries
- Index on `creator_user_id` for creator lookup
- Index on `is_active` for active events
- Composite index on `event_date, is_active`

#### event_signups
Many-to-many relationship table for user event registrations.

```sql
CREATE TABLE event_signups (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_id INTEGER NOT NULL REFERENCES calendar_events(id) ON DELETE CASCADE,
    signup_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, event_id)
);
```

**Indexes:**
- Primary key on `id`
- Unique composite index on `user_id, event_id`
- Index on `event_id` for event lookup
- Index on `signup_date` for chronological queries

#### user_sessions
Active user session tracking for security and multi-device management.

```sql
CREATE TABLE user_sessions (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(255) UNIQUE NOT NULL,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    is_active BOOLEAN DEFAULT true
);
```

**Indexes:**
- Primary key on `id`
- Unique index on `session_id`
- Index on `user_id` for user lookup
- Index on `expires_at` for cleanup
- Index on `is_active` for active sessions

#### login_attempts
Security audit log for all login attempts.

```sql
CREATE TABLE login_attempts (
    id SERIAL PRIMARY KEY,
    identifier VARCHAR(255) NOT NULL,
    success BOOLEAN NOT NULL,
    ip_address INET,
    user_agent TEXT,
    attempt_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    failure_reason VARCHAR(255)
);
```

**Indexes:**
- Primary key on `id`
- Index on `identifier` for user lookup
- Index on `attempt_time` for chronological queries
- Index on `success` for success/failure analysis
- Index on `ip_address` for IP-based queries

#### security_events
Comprehensive security event logging.

```sql
CREATE TABLE security_events (
    id SERIAL PRIMARY KEY,
    event_type VARCHAR(50) NOT NULL,
    event_description TEXT NOT NULL,
    user_id INTEGER REFERENCES users(id),
    student_id VARCHAR(7),
    email VARCHAR(255),
    ip_address INET,
    user_agent TEXT,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Indexes:**
- Primary key on `id`
- Index on `event_type` for event filtering
- Index on `user_id` for user-specific events
- Index on `created_at` for chronological queries
- GIN index on `metadata` for JSON queries

## 🔄 Database Relationships

### Entity Relationship Diagram
```
users (1) ──────────── (N) user_sessions
  │                           
  │ (1)                       
  │                           
  └────────── (N) event_signups (N) ──────────── (1) calendar_events
  │                                                    │
  │ (1)                                                │ (1)
  │                                                    │
  └────────── (N) security_events                     │
                                                       │ (1)
                                                       │
                                                  users (creator)
```

### Key Relationships
1. **users → user_sessions**: One user can have multiple active sessions
2. **users → event_signups**: One user can sign up for multiple events
3. **calendar_events → event_signups**: One event can have multiple participants
4. **users → security_events**: One user can have multiple security events
5. **users → calendar_events**: One user (admin) can create multiple events

## 🚀 Database Initialization

### Automatic Setup
The database is automatically initialized when the backend starts:

1. **Schema Creation**: All tables are created if they don't exist
2. **Default Admin Users**: Pre-configured admin accounts are inserted
3. **Indexes**: All necessary indexes are created for performance

### Initial Admin Accounts
```sql
INSERT INTO users (student_id, email, password_hash, role, is_active, email_verified) VALUES
('1007667', '1007667@mymail.sutd.edu.sg', '$2a$10$hashed_password', 'admin', TRUE, TRUE),
('1008148', '1008148@mymail.sutd.edu.sg', '$2a$10$hashed_password', 'admin', TRUE, TRUE)
ON CONFLICT (student_id) DO NOTHING;
```

**Default Credentials:**
- Student ID: `1007667`, Password: `Admin123!@#`
- Student ID: `1008148`, Password: `Admin123!@#`

## 🔍 Common Queries

### User Management Queries

#### Get User Profile
```sql
SELECT id, student_id, email, role, is_active, email_verified, created_at
FROM users 
WHERE student_id = $1 AND is_active = true;
```

#### Check User Authentication
```sql
SELECT id, student_id, email, password_hash, role, is_active, 
       email_verified, session_token_version
FROM users 
WHERE (student_id = $1 OR email = $1) AND is_active = true;
```

#### Get User Statistics
```sql
SELECT 
    COUNT(*) as total_users,
    COUNT(CASE WHEN role = 'admin' THEN 1 END) as admin_count,
    COUNT(CASE WHEN role = 'student' THEN 1 END) as student_count,
    COUNT(CASE WHEN email_verified = true THEN 1 END) as verified_count
FROM users 
WHERE is_active = true;
```

### Event Management Queries

#### Get Events for Month
```sql
SELECT 
    ce.*,
    CASE WHEN es.user_id IS NOT NULL THEN true ELSE false END as is_registered
FROM calendar_events ce
LEFT JOIN event_signups es ON ce.id = es.event_id AND es.user_id = $3
WHERE ce.event_date >= $1 AND ce.event_date <= $2 AND ce.is_active = true
ORDER BY ce.event_date, ce.start_time;
```

#### Get Event with Signup Count
```sql
SELECT 
    ce.*,
    COUNT(es.id) as signup_count
FROM calendar_events ce
LEFT JOIN event_signups es ON ce.id = es.event_id
WHERE ce.id = $1
GROUP BY ce.id;
```

#### Get User's Registered Events
```sql
SELECT ce.*, es.signup_date
FROM calendar_events ce
JOIN event_signups es ON ce.id = es.event_id
WHERE es.user_id = $1 AND ce.is_active = true
ORDER BY ce.event_date;
```

### Security Queries

#### Get Recent Login Attempts
```sql
SELECT *
FROM login_attempts
WHERE attempt_time >= NOW() - INTERVAL '24 hours'
ORDER BY attempt_time DESC
LIMIT 50;
```

#### Get Failed Login Count for User
```sql
SELECT COUNT(*)
FROM login_attempts
WHERE identifier = $1 
  AND success = false 
  AND attempt_time >= NOW() - INTERVAL '15 minutes';
```

#### Get Security Events
```sql
SELECT se.*, u.student_id, u.email
FROM security_events se
LEFT JOIN users u ON se.user_id = u.id
WHERE se.created_at >= $1
ORDER BY se.created_at DESC;
```

## 🛠️ Database Maintenance

### Regular Maintenance Tasks

#### Session Cleanup
```sql
-- Remove expired sessions
DELETE FROM user_sessions 
WHERE expires_at < NOW() OR is_active = false;
```

#### Old Log Cleanup
```sql
-- Remove old login attempts (older than 90 days)
DELETE FROM login_attempts 
WHERE attempt_time < NOW() - INTERVAL '90 days';

-- Remove old security events (older than 1 year)
DELETE FROM security_events 
WHERE created_at < NOW() - INTERVAL '1 year';
```

#### Update Event Participant Counts
```sql
-- Update current participant counts
UPDATE calendar_events 
SET current_participants = (
    SELECT COUNT(*) 
    FROM event_signups 
    WHERE event_id = calendar_events.id
);
```

### Performance Optimization

#### Table Statistics Update
```sql
-- Update table statistics for query optimization
ANALYZE users;
ANALYZE calendar_events;
ANALYZE event_signups;
ANALYZE user_sessions;
ANALYZE login_attempts;
ANALYZE security_events;
```

#### Index Maintenance
```sql
-- Reindex tables for performance
REINDEX TABLE users;
REINDEX TABLE calendar_events;
REINDEX TABLE event_signups;
```

## 🔧 Database Configuration

### Connection Pool Settings
```javascript
// Backend database configuration
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,                // Maximum number of connections
  idleTimeoutMillis: 30000, // Close idle connections after 30s
  connectionTimeoutMillis: 2000, // Timeout connection attempts after 2s
});
```

### PostgreSQL Configuration
```sql
-- Recommended PostgreSQL settings for production
shared_buffers = 256MB
effective_cache_size = 1GB
maintenance_work_mem = 64MB
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100
random_page_cost = 1.1
effective_io_concurrency = 200
```

## 🔄 Backup and Recovery

### Backup Strategy
```bash
# Daily database backup
pg_dump -h localhost -U webapp_user -d webapp_db > backup_$(date +%Y%m%d).sql

# Backup with compression
pg_dump -h localhost -U webapp_user -d webapp_db | gzip > backup_$(date +%Y%m%d).sql.gz
```

### Restore Process
```bash
# Restore from backup
psql -h localhost -U webapp_user -d webapp_db < backup_20250101.sql

# Restore from compressed backup
gunzip -c backup_20250101.sql.gz | psql -h localhost -U webapp_user -d webapp_db
```

## 📊 Monitoring and Analytics

### Key Metrics Queries

#### Daily Active Users
```sql
SELECT DATE(created_at) as date, COUNT(DISTINCT user_id) as active_users
FROM user_sessions
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date;
```

#### Event Popularity
```sql
SELECT ce.title, COUNT(es.id) as signup_count
FROM calendar_events ce
LEFT JOIN event_signups es ON ce.id = es.event_id
GROUP BY ce.id, ce.title
ORDER BY signup_count DESC;
```

#### Security Incident Trends
```sql
SELECT 
    DATE(created_at) as date,
    event_type,
    COUNT(*) as incident_count
FROM security_events
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at), event_type
ORDER BY date, incident_count DESC;
```

## 🚨 Troubleshooting

### Common Issues

#### Connection Pool Exhaustion
```sql
-- Check active connections
SELECT COUNT(*) FROM pg_stat_activity WHERE state = 'active';

-- Kill idle connections
SELECT pg_terminate_backend(pid) 
FROM pg_stat_activity 
WHERE state = 'idle' AND query_start < NOW() - INTERVAL '5 minutes';
```

#### Slow Queries
```sql
-- Enable query logging
ALTER SYSTEM SET log_min_duration_statement = 1000; -- Log queries > 1s
SELECT pg_reload_conf();

-- Check slow queries
SELECT query, mean_time, calls 
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;
```

#### Disk Space Issues
```sql
-- Check database size
SELECT pg_size_pretty(pg_database_size('webapp_db'));

-- Check table sizes
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

## 📚 Additional Resources

### PostgreSQL Documentation
- [PostgreSQL 15 Documentation](https://www.postgresql.org/docs/15/)
- [Connection Pooling Best Practices](https://www.postgresql.org/docs/15/runtime-config-connection.html)
- [Performance Tuning](https://www.postgresql.org/docs/15/performance-tips.html)

### Node.js PostgreSQL Integration
- [node-postgres Documentation](https://node-postgres.com/)
- [Connection Pool Configuration](https://node-postgres.com/features/pooling)

---

*For API integration with the database, see [API Documentation](api.md).*
*For security considerations, see [Security Documentation](security.md).*
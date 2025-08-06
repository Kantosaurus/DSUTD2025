# Troubleshooting Guide

Common issues and solutions for the DSUTD2025 Student Portal.

## 🚨 Common Issues

### 🐳 Docker and Container Issues

#### Container Won't Start
**Problem**: Container fails to start or exits immediately.

**Solutions**:
```bash
# Check container status and logs
docker-compose ps
docker-compose logs [service-name]

# Common fixes:
docker-compose down
docker-compose up --build

# Clean Docker cache
docker system prune -a
docker volume prune
```

**Root Causes**:
- Port conflicts
- Environment variable issues
- Build context problems
- Resource constraints

#### Port Already in Use
**Problem**: `Error: listen EADDRINUSE: address already in use :::3000`

**Solutions**:
```bash
# Check what's using the port
netstat -tulpn | grep :3000
lsof -i :3000

# Kill the process
kill -9 $(lsof -t -i:3000)

# Or use different ports in docker-compose.yml
ports:
  - "3001:3000"  # host:container
```

#### Docker Build Fails
**Problem**: Docker build process fails with errors.

**Solutions**:
```bash
# Clear build cache
docker builder prune

# Build with no cache
docker-compose build --no-cache

# Check Docker disk space
docker system df
docker system prune -a
```

#### Container Memory Issues
**Problem**: Container crashes due to memory limits.

**Solutions**:
```bash
# Check container resource usage
docker stats

# Increase memory limits in docker-compose.yml
services:
  frontend:
    deploy:
      resources:
        limits:
          memory: 1g
        reservations:
          memory: 512m
```

### 💾 Database Issues

#### Database Connection Refused
**Problem**: `ECONNREFUSED` or connection timeout errors.

**Solutions**:
```bash
# Check if PostgreSQL container is running
docker-compose ps postgres

# Check database logs
docker-compose logs postgres

# Restart database
docker-compose restart postgres

# Check database health
docker-compose exec postgres pg_isready -U webapp_user -d webapp_db
```

**Environment Check**:
```bash
# Verify database environment variables
echo $DATABASE_URL
```

#### Database Schema Issues
**Problem**: Tables don't exist or schema is incorrect.

**Solutions**:
```bash
# Run database initialization
docker-compose down -v  # Remove volumes
docker-compose up postgres  # Start fresh

# Manual schema creation
docker-compose exec postgres psql -U webapp_user -d webapp_db -f /docker-entrypoint-initdb.d/init.sql

# Check if tables exist
docker-compose exec postgres psql -U webapp_user -d webapp_db -c "\dt"
```

#### Database Performance Issues
**Problem**: Slow database queries or timeouts.

**Solutions**:
```sql
-- Check active connections
SELECT COUNT(*) FROM pg_stat_activity WHERE state = 'active';

-- Check slow queries
SELECT query, mean_time, calls 
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;

-- Check database size
SELECT pg_size_pretty(pg_database_size('webapp_db'));

-- Update table statistics
ANALYZE;
```

#### Database Disk Space Full
**Problem**: Database operations fail due to disk space.

**Solutions**:
```bash
# Check disk usage
df -h
docker system df

# Clean up old data
docker-compose exec postgres psql -U webapp_user -d webapp_db -c "
DELETE FROM login_attempts WHERE attempt_time < NOW() - INTERVAL '90 days';
DELETE FROM security_events WHERE created_at < NOW() - INTERVAL '1 year';
"

# Vacuum database
docker-compose exec postgres psql -U webapp_user -d webapp_db -c "VACUUM;"
```

### 🔐 Authentication Issues

#### JWT Token Issues
**Problem**: Authentication fails with token errors.

**Check JWT Secret**:
```bash
# Verify JWT_SECRET is set
echo $JWT_SECRET

# JWT_SECRET must be at least 32 characters
# Generate new secret if needed
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Debug Token**:
```javascript
// Check token structure (client-side)
const token = localStorage.getItem('token');
if (token) {
  const payload = JSON.parse(atob(token.split('.')[1]));
  console.log('Token payload:', payload);
  console.log('Token expires:', new Date(payload.exp * 1000));
}
```

#### Login Failures
**Problem**: Users cannot log in with correct credentials.

**Debugging Steps**:
```bash
# Check backend logs
docker-compose logs backend | grep -i login

# Check database for user
docker-compose exec postgres psql -U webapp_user -d webapp_db -c "
SELECT student_id, email, is_active, email_verified, account_locked_until 
FROM users WHERE student_id = '1234567';
"

# Check login attempts
docker-compose exec postgres psql -U webapp_user -d webapp_db -c "
SELECT * FROM login_attempts WHERE identifier = '1234567' 
ORDER BY attempt_time DESC LIMIT 5;
"
```

#### Account Locked
**Problem**: User account is locked after failed attempts.

**Solution**:
```sql
-- Unlock account
UPDATE users 
SET account_locked_until = NULL, failed_login_attempts = 0 
WHERE student_id = '1234567';

-- Check lockout status
SELECT student_id, failed_login_attempts, account_locked_until 
FROM users WHERE student_id = '1234567';
```

#### Session Issues
**Problem**: Users get logged out unexpectedly.

**Debugging**:
```sql
-- Check active sessions
SELECT us.*, u.student_id 
FROM user_sessions us
JOIN users u ON us.user_id = u.id
WHERE us.is_active = true;

-- Check session expiry
SELECT session_id, expires_at, 
       CASE WHEN expires_at > NOW() THEN 'Valid' ELSE 'Expired' END as status
FROM user_sessions 
WHERE user_id = 1;
```

### 🌐 Frontend Issues

#### Next.js Build Failures
**Problem**: Frontend build fails with TypeScript or dependency errors.

**Solutions**:
```bash
cd frontend

# Clear Next.js cache
rm -rf .next

# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Check TypeScript errors
npm run type-check

# Fix linting issues
npm run lint:fix

# Build again
npm run build
```

#### API Connection Issues
**Problem**: Frontend cannot connect to backend API.

**Check Configuration**:
```bash
# Verify API URL
echo $NEXT_PUBLIC_API_URL

# Check if backend is accessible
curl http://localhost:3001/health

# Check network connectivity
docker-compose exec frontend ping backend
```

**Debug API Calls**:
```javascript
// Check API calls in browser console
fetch('/api/health')
  .then(res => res.json())
  .then(data => console.log('API Response:', data))
  .catch(err => console.error('API Error:', err));
```

#### Static File Issues
**Problem**: Images or static files not loading.

**Solutions**:
```bash
# Check if files exist
ls -la frontend/public/

# Verify file permissions
chmod 644 frontend/public/*

# Check Next.js configuration
cat frontend/next.config.js
```

#### CSS/Styling Issues
**Problem**: Styles not applying or Tailwind CSS not working.

**Solutions**:
```bash
cd frontend

# Check Tailwind configuration
npm run build

# Verify Tailwind classes are being generated
cat .next/static/css/*.css | grep "your-class-name"

# Clear cache and rebuild
rm -rf .next
npm run build
```

### ⚡ Performance Issues

#### Slow Page Loading
**Problem**: Pages take too long to load.

**Frontend Optimization**:
```bash
# Check bundle size
cd frontend
npm run build

# Analyze bundle
npm install -g @next/bundle-analyzer
ANALYZE=true npm run build
```

**Backend Optimization**:
```javascript
// Add request timing middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    console.log(`${req.method} ${req.path} - ${Date.now() - start}ms`);
  });
  next();
});
```

#### Database Query Performance
**Problem**: Slow database queries affecting response time.

**Solutions**:
```sql
-- Enable query logging
ALTER SYSTEM SET log_min_duration_statement = 1000;
SELECT pg_reload_conf();

-- Check slow queries
SELECT query, mean_time, calls, total_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;

-- Add missing indexes
CREATE INDEX CONCURRENTLY idx_users_student_id ON users(student_id);
CREATE INDEX CONCURRENTLY idx_events_date ON calendar_events(event_date);
```

#### Memory Usage Issues
**Problem**: High memory consumption.

**Monitoring**:
```bash
# Check container memory usage
docker stats

# Check Node.js memory usage
docker-compose exec backend node -e "console.log(process.memoryUsage())"

# Monitor memory over time
while true; do
  docker stats --no-stream | grep webapp
  sleep 5
done
```

### 📧 Email Issues

#### Email Not Sending
**Problem**: Email verification/reset emails not being sent.

**Check Configuration**:
```bash
# Verify email environment variables
echo $EMAIL_USER
echo $EMAIL_FROM
# Don't echo EMAIL_PASSWORD for security

# Test email configuration
docker-compose exec backend node -e "
const nodemailer = require('nodemailer');
const transporter = nodemailer.createTransporter({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});
transporter.verify((error, success) => {
  if (error) console.log('Error:', error);
  else console.log('Email configuration is correct');
});
"
```

#### Gmail App Password Issues
**Problem**: Gmail authentication fails.

**Solutions**:
1. Enable 2-factor authentication on Gmail
2. Generate app-specific password
3. Use app password instead of regular password
4. Verify EMAIL_USER matches the Gmail account

### 🔧 Development Issues

#### Hot Reload Not Working
**Problem**: Changes not reflected during development.

**Solutions**:
```bash
# Check if file watching is working
docker-compose logs frontend | grep -i watch

# Restart development containers
docker-compose restart

# Check file system permissions
ls -la frontend/

# For Windows/WSL issues
# Add to package.json:
"scripts": {
  "dev": "next dev --turbo"
}
```

#### Environment Variables Not Loading
**Problem**: Environment variables not available in application.

**Check Loading**:
```bash
# Backend
docker-compose exec backend printenv | grep -E "(JWT|EMAIL|DATABASE)"

# Frontend (client-side variables must start with NEXT_PUBLIC_)
docker-compose exec frontend printenv | grep NEXT_PUBLIC
```

**Debug in Code**:
```javascript
// Backend
console.log('JWT_SECRET exists:', !!process.env.JWT_SECRET);

// Frontend
console.log('API URL:', process.env.NEXT_PUBLIC_API_URL);
```

## 🔍 Debugging Tools and Commands

### Docker Debugging
```bash
# Inspect container configuration
docker inspect webapp-frontend

# Access container shell
docker-compose exec frontend sh
docker-compose exec backend sh
docker-compose exec postgres psql -U webapp_user -d webapp_db

# View container logs with timestamps
docker-compose logs -t frontend

# Follow logs in real-time
docker-compose logs -f

# Check Docker resource usage
docker system df
docker stats

# Network debugging
docker network ls
docker network inspect dsutd2025_default
```

### Database Debugging
```sql
-- Connection information
SELECT * FROM pg_stat_activity;

-- Table sizes
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Index usage
SELECT 
  schemaname,
  tablename,
  attname,
  n_distinct,
  correlation
FROM pg_stats
WHERE schemaname = 'public';

-- Query performance
EXPLAIN ANALYZE SELECT * FROM users WHERE student_id = '1234567';
```

### Application Debugging
```bash
# Backend API testing
curl -X GET http://localhost:3001/health
curl -X GET http://localhost:3001/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN"

# Frontend debugging
# Open browser developer tools
# Check Console for JavaScript errors
# Check Network tab for API request failures
# Check Application tab for localStorage/cookies

# Check application logs
docker-compose logs backend | tail -50
docker-compose logs frontend | tail -50
```

## 📋 Diagnostic Checklist

### Pre-Deployment Checklist
- [ ] All environment variables configured
- [ ] Database connection working
- [ ] Email configuration tested
- [ ] SSL certificates valid
- [ ] Health checks passing
- [ ] Security headers configured
- [ ] Backup procedures in place

### Post-Deployment Checklist
- [ ] All services running
- [ ] Frontend accessible
- [ ] API endpoints responding
- [ ] Database queries working
- [ ] User authentication working
- [ ] Email functionality working
- [ ] Admin features accessible

### Performance Checklist
- [ ] Page load times < 3 seconds
- [ ] API response times < 500ms
- [ ] Database queries optimized
- [ ] Memory usage stable
- [ ] CPU usage reasonable
- [ ] Disk space sufficient

## 🆘 Emergency Procedures

### Service Recovery
```bash
# Emergency restart
docker-compose down
docker-compose up -d

# Database corruption recovery
docker-compose down
docker volume rm dsutd2025_postgres_data
docker-compose up -d
# Restore from backup

# Security incident response
docker-compose logs > security_incident.log
# Change all passwords and secrets
# Review security logs
# Update security configurations
```

### Rollback Procedures
```bash
# Rollback to previous version
git log --oneline -10
git checkout <previous-commit>
docker-compose down
docker-compose up --build -d

# Database rollback
# Restore from backup before problematic changes
pg_restore -d webapp_db backup_file.sql
```

## 📞 Getting Help

### Log Information to Collect
When seeking help, include:

1. **System Information**:
   ```bash
   docker version
   docker-compose version
   uname -a
   ```

2. **Container Status**:
   ```bash
   docker-compose ps
   docker-compose logs
   ```

3. **Error Messages**: Full error output with stack traces

4. **Configuration**: Relevant parts of docker-compose.yml and environment variables (redact secrets)

5. **Steps to Reproduce**: Exact steps that led to the issue

### Resources
- [Docker Documentation](https://docs.docker.com/)
- [Next.js Troubleshooting](https://nextjs.org/docs/messages)
- [PostgreSQL Error Codes](https://www.postgresql.org/docs/current/errcodes-appendix.html)
- [Node.js Debugging Guide](https://nodejs.org/en/docs/guides/debugging-getting-started/)

---

*For specific component issues, see the relevant documentation:*
- *[Development Guide](development.md) for development issues*
- *[Deployment Guide](deployment.md) for production issues*
- *[Security Documentation](security.md) for security concerns*
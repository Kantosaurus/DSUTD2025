# Security Features Documentation

## Overview
This document outlines the comprehensive security features implemented in the DSUTD2025 login system. The system employs multiple layers of security to protect against various attack vectors and ensure secure authentication.

## 🔐 Authentication Security

### 1. Password Security
- **Strong Password Requirements**: Minimum 8 characters with uppercase, lowercase, number, and special character
- **Secure Hashing**: Passwords are hashed using bcryptjs with salt rounds
- **Password Expiry**: Passwords expire after 90 days
- **Password Change Enforcement**: System can require password changes for security reasons

### 2. Account Protection
- **Account Lockout**: Accounts are locked after 5 failed login attempts
- **Lockout Duration**: 15-minute lockout period
- **Progressive Delays**: Increasing delays between login attempts
- **Account Status Monitoring**: Active/inactive account status tracking

### 3. Session Management
- **Secure JWT Tokens**: Tokens with issuer, audience, and algorithm validation
- **Session Tracking**: Database-backed session management
- **Token Versioning**: Session invalidation through token version increments
- **Session Expiry**: 2-hour session duration with automatic cleanup
- **Multi-device Logout**: Ability to logout from all devices

## 🛡️ Rate Limiting & DDoS Protection

### 1. Login Rate Limiting
- **Login Attempts**: 5 attempts per 15-minute window
- **Progressive Slowdown**: Increasing delays after 2 attempts
- **IP-based Tracking**: Rate limiting per IP address
- **User-based Tracking**: Rate limiting per user account

### 2. General Rate Limiting
- **API Protection**: 100 requests per 15 minutes per IP
- **Request Size Limits**: 10MB maximum request size
- **Header Protection**: Secure headers with Helmet.js

## 🔍 Security Monitoring & Logging

### 1. Comprehensive Logging
- **Login Attempts**: All login attempts logged with success/failure status
- **Security Events**: Detailed security event logging
- **IP Address Tracking**: Client IP address logging
- **User Agent Tracking**: Browser/device information logging

### 2. Audit Trail
- **Security Events Table**: Structured logging of all security-related events
- **Login Attempts Table**: Detailed login attempt tracking
- **User Sessions Table**: Session lifecycle monitoring
- **Metadata Storage**: JSON metadata for additional context

### 3. Real-time Monitoring
- **Admin Endpoints**: Security event monitoring for administrators
- **Login Attempt Analysis**: Failed login pattern detection
- **Session Monitoring**: Active session tracking

## 🚫 Attack Prevention

### 1. Brute Force Protection
- **Account Lockout**: Automatic account locking after failed attempts
- **Progressive Delays**: Increasing response times for repeated attempts
- **IP-based Restrictions**: Rate limiting per IP address
- **User Enumeration Prevention**: Consistent response times for non-existent users

### 2. Session Hijacking Prevention
- **Secure Cookies**: HttpOnly, Secure, SameSite cookies
- **Token Validation**: Comprehensive JWT token validation
- **Session Invalidation**: Immediate session termination on logout
- **IP Binding**: Session validation against originating IP

### 3. CSRF Protection
- **SameSite Cookies**: Strict same-site cookie policy
- **Token Validation**: JWT token validation with issuer/audience
- **Origin Validation**: CORS configuration with specific origins

## 🔧 Technical Implementation

### 1. Database Security
```sql
-- Enhanced users table with security fields
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    student_id VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    failed_login_attempts INTEGER DEFAULT 0,
    account_locked_until TIMESTAMP,
    password_changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    require_password_change BOOLEAN DEFAULT FALSE,
    two_factor_enabled BOOLEAN DEFAULT FALSE,
    session_token_version INTEGER DEFAULT 1
);

-- Security monitoring tables
CREATE TABLE login_attempts (
    id SERIAL PRIMARY KEY,
    student_id VARCHAR(50) NOT NULL,
    ip_address INET,
    user_agent TEXT,
    success BOOLEAN NOT NULL,
    attempt_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    failure_reason VARCHAR(100)
);

CREATE TABLE user_sessions (
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

CREATE TABLE security_events (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    event_type VARCHAR(50) NOT NULL,
    event_description TEXT,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB
);
```

### 2. Security Configuration
```javascript
const SECURITY_CONFIG = {
  MAX_LOGIN_ATTEMPTS: 5,
  LOCKOUT_DURATION_MINUTES: 15,
  SESSION_DURATION_HOURS: 2,
  PASSWORD_EXPIRY_DAYS: 90,
  RATE_LIMIT_WINDOW_MS: 15 * 60 * 1000, // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: 100,
  SLOW_DOWN_WINDOW_MS: 15 * 60 * 1000, // 15 minutes
  SLOW_DOWN_DELAY_MS: 500
};
```

### 3. JWT Token Security
```javascript
const tokenPayload = {
  userId: user.id,
  studentId: user.student_id,
  email: user.email,
  sessionId: sessionId,
  tokenVersion: user.session_token_version + 1,
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + (SECURITY_CONFIG.SESSION_DURATION_HOURS * 60 * 60)
};

const token = jwt.sign(tokenPayload, JWT_SECRET, {
  expiresIn: `${SECURITY_CONFIG.SESSION_DURATION_HOURS}h`,
  issuer: 'dsutd2025-api',
  audience: 'dsutd2025-frontend',
  algorithm: 'HS256'
});
```

## 🚀 API Endpoints

### Authentication Endpoints
- `POST /api/auth/login` - Secure login with rate limiting
- `POST /api/auth/logout` - Secure logout with session invalidation
- `POST /api/auth/logout-all` - Logout from all devices
- `GET /api/auth/me` - Get current user profile

### Security Monitoring Endpoints
- `GET /api/admin/security-events` - View security events (protected)
- `GET /api/admin/login-attempts` - View login attempts (protected)

## 🔄 Automatic Maintenance

### 1. Session Cleanup
- **Automatic Cleanup**: Expired sessions cleaned up every hour
- **Database Maintenance**: Regular cleanup of old security logs
- **Memory Management**: Efficient session storage and retrieval

### 2. Security Monitoring
- **Real-time Alerts**: Security event monitoring
- **Pattern Detection**: Failed login pattern analysis
- **Performance Monitoring**: Response time tracking

## 📊 Security Metrics

### 1. Login Security
- Failed login attempts tracking
- Account lockout statistics
- Session duration monitoring
- Password expiry notifications

### 2. System Security
- Rate limiting effectiveness
- Security event frequency
- Session management efficiency
- Database security performance

## 🛠️ Configuration Options

### Environment Variables
```bash
# Security Configuration
JWT_SECRET=your-secure-jwt-secret
NODE_ENV=production
FRONTEND_URL=http://localhost:3000

# Database Configuration
DATABASE_URL=postgresql://user:password@localhost:5432/dbname

# Optional: Disable automatic migrations
AUTO_MIGRATE=false
```

### Security Headers
```javascript
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));
```

## 🔒 Best Practices Implemented

1. **Defense in Depth**: Multiple security layers
2. **Principle of Least Privilege**: Minimal required permissions
3. **Fail Securely**: Secure default configurations
4. **Security by Design**: Security built into architecture
5. **Continuous Monitoring**: Real-time security monitoring
6. **Audit Trail**: Comprehensive logging and tracking
7. **Session Management**: Secure session handling
8. **Input Validation**: Comprehensive input sanitization
9. **Error Handling**: Secure error responses
10. **Configuration Management**: Secure configuration handling

## 🚨 Incident Response

### 1. Account Compromise
- Immediate session invalidation
- Password change requirement
- Security event logging
- Admin notification

### 2. Brute Force Attack
- Automatic account lockout
- IP-based rate limiting
- Security event logging
- Pattern detection alerts

### 3. Session Hijacking
- Token version invalidation
- Session termination
- Security event logging
- User notification

## 📈 Security Monitoring Dashboard

The system includes admin endpoints for monitoring:
- Recent security events
- Failed login attempts
- Active sessions
- Account lockouts
- Password expiry status

## 🔮 Future Enhancements

1. **Two-Factor Authentication (2FA)**: TOTP/HOTP support
2. **Biometric Authentication**: Fingerprint/face recognition
3. **Device Fingerprinting**: Advanced device tracking
4. **Machine Learning**: Anomaly detection
5. **Advanced Analytics**: Security metrics dashboard
6. **Integration**: SIEM system integration
7. **Compliance**: GDPR, SOC2 compliance features

---

This security implementation provides enterprise-grade protection while maintaining usability and performance. All security features are configurable and can be adjusted based on specific requirements. 
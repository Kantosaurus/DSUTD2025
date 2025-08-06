# Security Features

Comprehensive security documentation for the DSUTD2025 Student Portal.

## 🛡️ Security Overview

The DSUTD2025 Student Portal implements enterprise-grade security features to protect user data and prevent common web vulnerabilities.

## 🔐 Authentication Security

### Password Requirements
Strong password policies are enforced for all user accounts:

- **Minimum Length**: 12 characters
- **Character Requirements**:
  - At least 1 uppercase letter (A-Z)
  - At least 1 lowercase letter (a-z)
  - At least 1 number (0-9)
  - At least 1 special character (!@#$%^&*(),.?":{}|<>)

### Password Security Features
- **Hashing**: bcryptjs with 10 salt rounds
- **Password Expiry**: 90-day automatic expiration
- **Password History**: Prevents reuse of last 5 passwords
- **Secure Storage**: Never stored in plaintext

### Account Protection
- **Account Lockout**: 5 failed attempts trigger 15-minute lockout
- **Progressive Delays**: Increasing response times for repeated failed attempts
- **User Enumeration Prevention**: Consistent response times regardless of user existence

## 🎫 Session Management

### JWT Token Security
- **Algorithm**: HS256 (HMAC with SHA-256)
- **Issuer Validation**: Tokens must be issued by `dsutd2025-api`
- **Audience Validation**: Tokens must be for `dsutd2025-frontend`
- **Expiration**: 2-hour token lifetime
- **Secret**: Cryptographically secure random string (minimum 32 characters)

### Session Features
- **Session Tracking**: Database-backed session management
- **Token Versioning**: Immediate session invalidation through version increments
- **Multi-device Support**: Track and manage sessions across devices
- **Session Cleanup**: Automatic cleanup of expired sessions

### Session Security
```javascript
// JWT Payload Structure
{
  "userId": 1,
  "studentId": "1234567",
  "email": "user@mymail.sutd.edu.sg",
  "role": "admin|student",
  "sessionId": "uuid-v4",
  "tokenVersion": 1,
  "iss": "dsutd2025-api",
  "aud": "dsutd2025-frontend",
  "jti": "unique-token-id",
  "iat": 1640995200,
  "exp": 1641001200
}
```

## 🚫 Attack Prevention

### Brute Force Protection
- **Rate Limiting**: 5 login attempts per 15-minute window per IP
- **Account Lockout**: Automatic lockout after failed attempts
- **Progressive Delays**: Increasing delays for repeated attempts
- **IP-based Tracking**: Monitor attempts by IP address

### SQL Injection Prevention
- **Parameterized Queries**: All database queries use parameterized statements
- **Input Validation**: Server-side validation for all inputs
- **ORM Protection**: PostgreSQL driver with built-in injection protection

### Cross-Site Scripting (XSS) Prevention
- **Input Sanitization**: HTML encoding of user inputs
- **Content Security Policy**: Strict CSP headers
- **React Built-in Protection**: Automatic XSS prevention in React components

### Cross-Site Request Forgery (CSRF) Prevention
- **SameSite Cookies**: Cookies set with SameSite=Strict
- **Origin Validation**: Verify request origins
- **CORS Configuration**: Specific allowed origins

## 🔍 Security Monitoring

### Comprehensive Logging
All security-relevant events are logged with full context:

```javascript
// Security Event Structure
{
  "event_type": "LOGIN_SUCCESS|LOGIN_FAILED|ACCOUNT_LOCKED|...",
  "event_description": "Detailed description",
  "user_id": 1,
  "student_id": "1234567",
  "ip_address": "192.168.1.100",
  "user_agent": "Mozilla/5.0...",
  "metadata": {
    "additional": "context"
  },
  "created_at": "2025-01-01T10:00:00Z"
}
```

### Security Event Types
- `LOGIN_SUCCESS` - Successful login attempt
- `LOGIN_FAILED` - Failed login attempt
- `ACCOUNT_LOCKED` - Account locked due to failed attempts
- `ACCOUNT_UNLOCKED` - Account unlocked after timeout
- `PASSWORD_CHANGED` - Password changed by user
- `PASSWORD_RESET_REQUESTED` - Password reset requested
- `PASSWORD_RESET_COMPLETED` - Password reset completed
- `SESSION_CREATED` - New session created
- `SESSION_EXPIRED` - Session expired
- `LOGOUT` - User logout
- `LOGOUT_ALL` - User logged out from all devices
- `UNAUTHORIZED_ACCESS` - Attempted unauthorized access
- `SUSPICIOUS_ACTIVITY` - Suspicious behavior detected

### Real-time Monitoring
- **Admin Dashboard**: Real-time security metrics
- **Login Attempts**: Track all login attempts with details
- **Failed Login Tracking**: Monitor and alert on repeated failures
- **Session Analytics**: Track active sessions and usage patterns

## 🛡️ HTTP Security Headers

### Security Headers Implemented
```javascript
// Helmet.js Configuration
{
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      baseUri: ["'self'"],
      fontSrc: ["'self'", "https:", "data:"],
      formAction: ["'self'"],
      frameAncestors: ["'self'"],
      objectSrc: ["'none'"],
      scriptSrcAttr: ["'none'"],
      upgradeInsecureRequests: []
    }
  },
  crossOriginOpenerPolicy: { policy: "same-origin" },
  crossOriginResourcePolicy: { policy: "same-origin" },
  originAgentCluster: true,
  referrerPolicy: { policy: "no-referrer" },
  strictTransportSecurity: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  xContentTypeOptions: true,
  xFrameOptions: { action: "deny" },
  xPermittedCrossDomainPolicies: false,
  xPoweredBy: false,
  xXssProtection: true
}
```

## 🔒 Data Protection

### Personal Information Security
- **Email Validation**: Strict email format validation
- **Student ID Protection**: Unique identifier validation
- **Data Minimization**: Only collect necessary information
- **Secure Transmission**: HTTPS encryption for all data

### Database Security
- **Connection Pooling**: Secure database connections
- **Prepared Statements**: Prevent SQL injection
- **Access Control**: Role-based database access
- **Audit Trail**: Complete audit log of data changes

## 🎯 Role-Based Access Control

### User Roles
- **Student**: Standard user with limited access
- **Admin**: Administrative user with full access

### Permission Matrix
| Feature | Student | Admin |
|---------|---------|-------|
| View Events | ✅ | ✅ |
| Register for Events | ✅ | ✅ |
| Create Events | ❌ | ✅ |
| Manage Events | ❌ | ✅ |
| View Security Logs | ❌ | ✅ |
| User Management | ❌ | ✅ |
| System Analytics | ❌ | ✅ |

### Authorization Implementation
```javascript
// Route Protection Example
router.get('/admin/events', 
  authenticateToken,    // Verify JWT token
  requireAdmin,         // Check admin role
  async (req, res) => {
    // Admin-only logic
  }
);
```

## 📧 Email Security

### Email Verification
- **Required Verification**: Email must be verified for account activation
- **Secure Tokens**: Cryptographically secure verification tokens
- **Token Expiry**: Limited-time verification tokens

### Password Reset Security
- **Secure Tokens**: One-time use reset tokens
- **Token Expiry**: 1-hour expiration for reset tokens
- **Rate Limiting**: Prevent reset token abuse

## 🔧 Security Configuration

### Environment Variables
```bash
# Security-related environment variables
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters
EMAIL_USER=your-secure-email@gmail.com
EMAIL_PASSWORD=your-16-character-app-password
NODE_ENV=production
```

### CORS Configuration
```javascript
// CORS Settings
{
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}
```

## 🚨 Security Incident Response

### Automatic Responses
- **Account Lockout**: Immediate lockout after threshold
- **Session Invalidation**: Immediate session termination on suspicious activity
- **Rate Limiting**: Automatic IP-based rate limiting
- **Logging**: All incidents automatically logged

### Manual Responses
- **Admin Alerts**: Real-time notifications for critical events
- **Session Management**: Admin ability to terminate user sessions
- **Account Management**: Admin ability to lock/unlock accounts

## 📊 Security Metrics

### Key Performance Indicators
- **Failed Login Rate**: Percentage of failed vs successful logins
- **Account Lockout Rate**: Number of accounts locked per day
- **Session Duration**: Average session length
- **Suspicious Activity**: Flagged security events

### Monitoring Dashboard
- Real-time security metrics
- Historical trend analysis
- Alert thresholds and notifications
- Detailed audit logs

## ✅ Security Checklist

### Development Security
- [ ] Environment variables properly configured
- [ ] HTTPS enabled in production
- [ ] Database credentials secured
- [ ] API keys properly managed
- [ ] Security headers implemented
- [ ] Input validation on all endpoints
- [ ] Rate limiting configured
- [ ] Error handling doesn't expose sensitive info

### Deployment Security
- [ ] Production database secured
- [ ] SSL certificates valid
- [ ] Firewall rules configured
- [ ] Backup encryption enabled
- [ ] Log monitoring setup
- [ ] Intrusion detection configured
- [ ] Regular security updates scheduled

## 🔄 Security Updates

### Regular Maintenance
- **Dependency Updates**: Regular npm audit and updates
- **Security Patches**: Immediate application of security patches
- **Key Rotation**: Regular JWT secret rotation
- **Certificate Renewal**: SSL certificate maintenance

### Security Reviews
- Monthly security log reviews
- Quarterly penetration testing
- Annual security audit
- Continuous monitoring setup

## 📚 Security Resources

### Standards Compliance
- **OWASP Top 10**: Protection against common vulnerabilities
- **JWT Best Practices**: RFC 7519 compliance
- **Password Security**: NIST guidelines compliance

### Documentation References
- [OWASP Security Guidelines](https://owasp.org/)
- [JWT Security Best Practices](https://tools.ietf.org/html/rfc7519)
- [Node.js Security Checklist](https://nodejs.org/en/docs/guides/security/)

---

*For implementation details, see [Authentication Guide](authentication.md).*
*For API security, see [API Documentation](api.md).*
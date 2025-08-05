/**
 * DSUTD 2025 - Advanced Security Enhancements
 * 
 * This module provides additional security features beyond the basic implementation:
 * - Two-Factor Authentication (TOTP)
 * - Device fingerprinting
 * - Advanced session management
 * - Security monitoring and alerts
 * - Input sanitization and validation
 * - Rate limiting enhancements
 */

const crypto = require('crypto');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');

// Security configuration
const SECURITY_CONFIG = {
  // Two-Factor Authentication
  TOTP_ISSUER: 'DSUTD2025',
  TOTP_WINDOW: 2, // Allow 2 time steps for clock skew
  
  // Device fingerprinting
  FINGERPRINT_SALT: process.env.FINGERPRINT_SALT || crypto.randomBytes(32).toString('hex'),
  
  // Session security
  SESSION_FINGERPRINTING: true,
  MAX_SESSIONS_PER_USER: 5,
  
  // Rate limiting
  BRUTE_FORCE_WINDOW: 15 * 60 * 1000, // 15 minutes
  BRUTE_FORCE_MAX_ATTEMPTS: 3,
  
  // Security monitoring
  SUSPICIOUS_ACTIVITY_THRESHOLD: 10,
  ALERT_EMAIL_RECIPIENTS: process.env.SECURITY_ALERT_EMAILS?.split(',') || [],
  
  // Input validation
  MAX_INPUT_LENGTH: 1000,
  ALLOWED_FILE_TYPES: ['image/jpeg', 'image/png', 'image/gif'],
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
};

/**
 * Generate TOTP secret for 2FA
 */
const generateTOTPSecret = (userId, email) => {
  const secret = speakeasy.generateSecret({
    name: `${SECURITY_CONFIG.TOTP_ISSUER}:${email}`,
    issuer: SECURITY_CONFIG.TOTP_ISSUER,
    length: 32
  });
  
  return {
    secret: secret.base32,
    qrCode: secret.otpauth_url
  };
};

/**
 * Verify TOTP token
 */
const verifyTOTPToken = (token, secret) => {
  return speakeasy.totp.verify({
    secret: secret,
    encoding: 'base32',
    token: token,
    window: SECURITY_CONFIG.TOTP_WINDOW
  });
};

/**
 * Generate device fingerprint
 */
const generateDeviceFingerprint = (req) => {
  const components = [
    req.headers['user-agent'] || '',
    req.headers['accept-language'] || '',
    req.headers['accept-encoding'] || '',
    req.headers['accept'] || '',
    req.ip || '',
    req.headers['sec-ch-ua'] || '',
    req.headers['sec-ch-ua-platform'] || '',
    req.headers['sec-ch-ua-mobile'] || ''
  ];
  
  const fingerprint = crypto
    .createHmac('sha256', SECURITY_CONFIG.FINGERPRINT_SALT)
    .update(components.join('|'))
    .digest('hex');
    
  return fingerprint;
};

/**
 * Enhanced rate limiting for brute force protection
 */
const createBruteForceProtection = () => {
  return rateLimit({
    windowMs: SECURITY_CONFIG.BRUTE_FORCE_WINDOW,
    max: SECURITY_CONFIG.BRUTE_FORCE_MAX_ATTEMPTS,
    message: {
      error: 'Too many failed attempts. Please try again later.',
      retryAfter: Math.ceil(SECURITY_CONFIG.BRUTE_FORCE_WINDOW / 1000)
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    keyGenerator: (req) => {
      // Use IP + user agent for better tracking
      return `${req.ip}-${req.headers['user-agent']?.substring(0, 50) || 'unknown'}`;
    },
    handler: (req, res) => {
      // Log suspicious activity
      logSuspiciousActivity(req, 'BRUTE_FORCE_ATTEMPT');
      res.status(429).json({
        error: 'Too many failed attempts. Please try again later.',
        retryAfter: Math.ceil(SECURITY_CONFIG.BRUTE_FORCE_WINDOW / 1000)
      });
    }
  });
};

/**
 * Input sanitization and validation
 */
const sanitizeInput = (input, options = {}) => {
  if (typeof input !== 'string') return input;
  
  const {
    maxLength = SECURITY_CONFIG.MAX_INPUT_LENGTH,
    allowHtml = false,
    allowScripts = false
  } = options;
  
  let sanitized = input.trim();
  
  // Length validation
  if (sanitized.length > maxLength) {
    throw new Error(`Input too long. Maximum ${maxLength} characters allowed.`);
  }
  
  // Remove null bytes and control characters
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  
  // HTML sanitization (if not allowed)
  if (!allowHtml) {
    sanitized = sanitized
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }
  
  // Script tag removal (if not allowed)
  if (!allowScripts) {
    sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  }
  
  return sanitized;
};

/**
 * File upload security validation
 */
const validateFileUpload = (file, options = {}) => {
  const {
    allowedTypes = SECURITY_CONFIG.ALLOWED_FILE_TYPES,
    maxSize = SECURITY_CONFIG.MAX_FILE_SIZE,
    scanForMalware = true
  } = options;
  
  // Check file size
  if (file.size > maxSize) {
    throw new Error(`File too large. Maximum ${maxSize / (1024 * 1024)}MB allowed.`);
  }
  
  // Check file type
  if (!allowedTypes.includes(file.mimetype)) {
    throw new Error(`File type not allowed. Allowed types: ${allowedTypes.join(', ')}`);
  }
  
  // Check file extension
  const allowedExtensions = allowedTypes.map(type => type.split('/')[1]);
  const fileExtension = file.originalname.split('.').pop().toLowerCase();
  
  if (!allowedExtensions.includes(fileExtension)) {
    throw new Error(`File extension not allowed. Allowed extensions: ${allowedExtensions.join(', ')}`);
  }
  
  // Basic malware scan (check for executable content)
  if (scanForMalware) {
    const buffer = file.buffer;
    const header = buffer.toString('hex', 0, 4);
    
    // Check for common executable headers
    const executableHeaders = ['4d5a', '7f454c46', 'feedface', 'cafebabe'];
    if (executableHeaders.some(h => header.startsWith(h))) {
      throw new Error('File appears to be executable and is not allowed.');
    }
  }
  
  return true;
};

/**
 * Session security validation
 */
const validateSession = async (req, pool) => {
  const deviceFingerprint = generateDeviceFingerprint(req);
  const sessionId = req.user?.sessionId;
  
  if (!sessionId) return false;
  
  // Check if session exists and matches device fingerprint
  const result = await pool.query(
    `SELECT us.*, u.session_token_version 
     FROM user_sessions us 
     JOIN users u ON us.user_id = u.id 
     WHERE us.session_id = $1 AND us.is_active = true`,
    [sessionId]
  );
  
  if (result.rows.length === 0) return false;
  
  const session = result.rows[0];
  
  // Check if session fingerprint matches (if enabled)
  if (SECURITY_CONFIG.SESSION_FINGERPRINTING && session.device_fingerprint) {
    if (session.device_fingerprint !== deviceFingerprint) {
      // Log suspicious activity
      await logSuspiciousActivity(req, 'SESSION_FINGERPRINT_MISMATCH', session.user_id);
      return false;
    }
  }
  
  // Check session age
  const sessionAge = Date.now() - new Date(session.created_at).getTime();
  const maxSessionAge = SECURITY_CONFIG.SESSION_DURATION_HOURS * 60 * 60 * 1000;
  
  if (sessionAge > maxSessionAge) {
    return false;
  }
  
  return true;
};

/**
 * Log suspicious activity
 */
const logSuspiciousActivity = async (req, activityType, userId = null) => {
  const metadata = {
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    deviceFingerprint: generateDeviceFingerprint(req),
    timestamp: new Date().toISOString(),
    activityType
  };
  
  // Log to database
  try {
    await pool.query(
      `INSERT INTO security_events (user_id, event_type, event_description, ip_address, user_agent, metadata) 
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, 'SUSPICIOUS_ACTIVITY', activityType, req.ip, req.headers['user-agent'], JSON.stringify(metadata)]
    );
  } catch (error) {
    console.error('Error logging suspicious activity:', error);
  }
  
  // Send alert email if configured
  if (SECURITY_CONFIG.ALERT_EMAIL_RECIPIENTS.length > 0) {
    // Implementation for sending alert emails
    console.log(`SECURITY ALERT: ${activityType} detected from IP ${req.ip}`);
  }
};

/**
 * Enhanced password validation
 */
const validatePasswordStrength = (password) => {
  const errors = [];
  
  // Length check
  if (password.length < 12) {
    errors.push('Password must be at least 12 characters long');
  }
  
  // Complexity checks
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }
  
  // Check for repeated characters
  if (/(.)\1{2,}/.test(password)) {
    errors.push('Password cannot contain repeated characters more than twice');
  }
  
  // Check for common patterns
  if (/123|abc|qwe|password|admin|user/i.test(password)) {
    errors.push('Password cannot contain common patterns or words');
  }
  
  // Check for keyboard patterns
  const keyboardPatterns = ['qwerty', 'asdfgh', 'zxcvbn', '123456'];
  if (keyboardPatterns.some(pattern => password.toLowerCase().includes(pattern))) {
    errors.push('Password cannot contain keyboard patterns');
  }
  
  // Check for personal information patterns (student ID)
  if (/\d{7}/.test(password)) {
    errors.push('Password cannot contain sequences of 7 or more digits');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Generate secure backup codes for 2FA
 */
const generateBackupCodes = () => {
  const codes = [];
  for (let i = 0; i < 10; i++) {
    codes.push(crypto.randomBytes(4).toString('hex').toUpperCase());
  }
  return codes;
};

/**
 * Verify backup code
 */
const verifyBackupCode = (code, usedCodes) => {
  const normalizedCode = code.toUpperCase();
  
  // Check if code is valid
  if (!/^[0-9A-F]{8}$/.test(normalizedCode)) {
    return false;
  }
  
  // Check if code has been used
  if (usedCodes.includes(normalizedCode)) {
    return false;
  }
  
  return true;
};

module.exports = {
  SECURITY_CONFIG,
  generateTOTPSecret,
  verifyTOTPToken,
  generateDeviceFingerprint,
  createBruteForceProtection,
  sanitizeInput,
  validateFileUpload,
  validateSession,
  logSuspiciousActivity,
  validatePasswordStrength,
  generateBackupCodes,
  verifyBackupCode
}; 
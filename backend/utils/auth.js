const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const { pool, JWT_SECRET } = require('../config/database');
const SECURITY_CONFIG = require('../config/security');

// Enhanced token generation with additional security
const generateSecureToken = (payload) => {
  const enhancedPayload = {
    ...payload,
    iss: 'dsutd2025-api',
    aud: 'dsutd2025-frontend',
    jti: uuidv4(),
    iat: Math.floor(Date.now() / 1000)
  };
  
  return jwt.sign(enhancedPayload, JWT_SECRET, {
    algorithm: 'HS256',
    expiresIn: `${SECURITY_CONFIG.SESSION_DURATION_HOURS}h`
  });
};

// Validate password strength
const validatePasswordStrength = (password) => {
  const errors = [];
  
  if (password.length < SECURITY_CONFIG.MIN_PASSWORD_LENGTH) {
    errors.push(`Password must be at least ${SECURITY_CONFIG.MIN_PASSWORD_LENGTH} characters long`);
  }
  
  if (SECURITY_CONFIG.PASSWORD_COMPLEXITY_REQUIRED) {
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }
  }
  
  return errors;
};

// Generate verification code
const generateVerificationCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Generate secure random token
const generateSecureRandomToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

// Create user session
const createUserSession = async (userId, req) => {
  try {
    const sessionId = uuidv4();
    const expiresAt = new Date(Date.now() + (SECURITY_CONFIG.SESSION_DURATION_HOURS * 60 * 60 * 1000));
    const ipAddress = req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.ip;
    const userAgent = req.headers['user-agent'] || 'Unknown';
    
    await pool.query(
      `INSERT INTO user_sessions (user_id, session_id, ip_address, user_agent, expires_at) 
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, sessionId, ipAddress, userAgent, expiresAt]
    );
    
    return sessionId;
  } catch (error) {
    console.error('Error creating user session:', error);
    throw error;
  }
};

// Hash password
const hashPassword = async (password) => {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
};

// Compare password
const comparePassword = async (password, hash) => {
  return await bcrypt.compare(password, hash);
};

// Generate secure temporary password
const generateTemporaryPassword = () => {
  const upperCase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowerCase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const specialChars = '!@#$%^&*';
  
  let password = '';
  
  // Ensure at least one character from each category
  password += upperCase[crypto.randomInt(0, upperCase.length)];
  password += lowerCase[crypto.randomInt(0, lowerCase.length)];
  password += numbers[crypto.randomInt(0, numbers.length)];
  password += specialChars[crypto.randomInt(0, specialChars.length)];
  
  // Fill the rest with random characters from all categories
  const allChars = upperCase + lowerCase + numbers + specialChars;
  for (let i = password.length; i < 12; i++) {
    password += allChars[crypto.randomInt(0, allChars.length)];
  }
  
  // Shuffle the password to randomize character positions
  return password.split('').sort(() => crypto.randomInt(0, 2) - 0.5).join('');
};

module.exports = {
  generateSecureToken,
  validatePasswordStrength,
  generateVerificationCode,
  generateSecureRandomToken,
  createUserSession,
  hashPassword,
  comparePassword,
  generateTemporaryPassword
};
const { pool } = require('../config/database');
const SECURITY_CONFIG = require('../config/security');

// Security utility functions
const getClientIP = (req) => {
  return req.headers['x-forwarded-for'] || 
         req.headers['x-real-ip'] || 
         req.connection.remoteAddress || 
         req.socket.remoteAddress || 
         req.ip;
};

const getUserAgent = (req) => {
  return req.headers['user-agent'] || 'Unknown';
};

const logSecurityEvent = async (eventType, eventDescription, userId = null, metadata = {}, req = null) => {
  try {
    const ipAddress = req ? getClientIP(req) : null;
    const userAgent = req ? getUserAgent(req) : null;
    
    await pool.query(
      `INSERT INTO security_events (user_id, event_type, event_description, ip_address, user_agent, metadata) 
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, eventType, eventDescription, ipAddress, userAgent, JSON.stringify(metadata)]
    );
  } catch (error) {
    console.error('Error logging security event:', error);
  }
};

const logLoginAttempt = async (studentId, success, failureReason = null, req = null) => {
  try {
    const ipAddress = req ? getClientIP(req) : null;
    const userAgent = req ? getUserAgent(req) : null;
    
    await pool.query(
      `INSERT INTO login_attempts (student_id, ip_address, user_agent, success, failure_reason) 
       VALUES ($1, $2, $3, $4, $5)`,
      [studentId, ipAddress, userAgent, success, failureReason]
    );
  } catch (error) {
    console.error('Error logging login attempt:', error);
  }
};

const checkAccountLockout = async (studentId) => {
  try {
    const result = await pool.query(
      'SELECT failed_login_attempts, account_locked_until FROM users WHERE student_id = $1',
      [studentId]
    );
    
    if (result.rows.length === 0) return { locked: false };
    
    const user = result.rows[0];
    
    // Check if account is locked
    if (user.account_locked_until && new Date() < user.account_locked_until) {
      return { 
        locked: true, 
        lockedUntil: user.account_locked_until,
        remainingMinutes: Math.ceil((user.account_locked_until - new Date()) / (1000 * 60))
      };
    }
    
    return { locked: false };
  } catch (error) {
    console.error('Error checking account lockout:', error);
    return { locked: false };
  }
};

const incrementFailedLoginAttempts = async (studentId) => {
  try {
    const result = await pool.query(
      'UPDATE users SET failed_login_attempts = failed_login_attempts + 1 WHERE student_id = $1 RETURNING failed_login_attempts',
      [studentId]
    );
    
    const failedAttempts = result.rows[0]?.failed_login_attempts || 0;
    
    // Lock account if max attempts reached
    if (failedAttempts >= SECURITY_CONFIG.MAX_LOGIN_ATTEMPTS) {
      const lockoutUntil = new Date(Date.now() + (SECURITY_CONFIG.LOCKOUT_DURATION_MINUTES * 60 * 1000));
      await pool.query(
        'UPDATE users SET account_locked_until = $1 WHERE student_id = $2',
        [lockoutUntil, studentId]
      );
    }
    
    return failedAttempts;
  } catch (error) {
    console.error('Error incrementing failed login attempts:', error);
    return 0;
  }
};

const resetFailedLoginAttempts = async (studentId) => {
  try {
    await pool.query(
      'UPDATE users SET failed_login_attempts = 0, account_locked_until = NULL WHERE student_id = $1',
      [studentId]
    );
  } catch (error) {
    console.error('Error resetting failed login attempts:', error);
  }
};

module.exports = {
  getClientIP,
  getUserAgent,
  logSecurityEvent,
  logLoginAttempt,
  checkAccountLockout,
  incrementFailedLoginAttempts,
  resetFailedLoginAttempts
};
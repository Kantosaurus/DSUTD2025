const express = require('express');
const { body, validationResult } = require('express-validator');
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { loginRateLimit, loginSlowDown, passwordResetLimiter } = require('../middleware/rateLimiting');
const { logSecurityEvent, logLoginAttempt, checkAccountLockout, incrementFailedLoginAttempts, resetFailedLoginAttempts } = require('../utils/security');
const { generateSecureToken, validatePasswordStrength, generateVerificationCode, generateSecureRandomToken, createUserSession, hashPassword, comparePassword, generateTemporaryPassword } = require('../utils/auth');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../services/emailService');
const TelegramMfaService = require('../services/telegramMfaService');
const EMAIL_CONFIG = require('../config/email');
const SECURITY_CONFIG = require('../config/security');

const router = express.Router();

// Sign up endpoint (DEPRECATED - use Telegram /signup instead)
router.post('/signup', [
  body('studentId')
    .matches(/^100\d{4}$/)
    .withMessage('Student ID must be in format 100XXXX where X is a digit from 0-9'),
  body('password')
    .isLength({ min: 12 })
    .withMessage('Password must be at least 12 characters long')
    .matches(/[A-Z]/)
    .withMessage('Password must contain at least one uppercase letter')
    .matches(/[a-z]/)
    .withMessage('Password must contain at least one lowercase letter')
    .matches(/\d/)
    .withMessage('Password must contain at least one number')
    .matches(/[!@#$%^&*(),.?":{}|<>]/)
    .withMessage('Password must contain at least one special character')
    .matches(/^(?!.*(.)\1{2,}).*$/)
    .withMessage('Password cannot contain repeated characters more than twice')
    .matches(/^(?!.*(123|abc|qwe|password|admin|user)).*$/i)
    .withMessage('Password cannot contain common patterns or words'),
  body('telegramHandle')
    .optional()
    .isLength({ max: 32 })
    .withMessage('Telegram handle must be 32 characters or less')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Telegram handle can only contain letters, numbers, and underscores')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    // Return error - signup is now done via Telegram only
    return res.status(400).json({
      error: 'Web signup is no longer available. Please use Telegram to create your account.',
      instructions: [
        '1. Open Telegram and search for the DSUTD bot',
        '2. Send: /signup YOUR_STUDENT_ID',
        '3. Follow the instructions to set your password',
        '4. Your account will be created instantly'
      ],
      telegramBot: '@DSUTDBot' // Replace with actual bot username
    });

    // Legacy code (kept for reference but not executed)
    const { studentId, password, telegramHandle } = req.body;
    const email = `${studentId}@mymail.sutd.edu.sg`;
    const role = 'student';
    const identifier = studentId;

    // Check if user already exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE student_id = $1 OR email = $2',
      [identifier, email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({ 
        error: `${isClubSignup ? 'Club' : 'User'} with this ${isClubSignup ? 'email' : 'student ID'} already exists` 
      });
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Generate verification code
    const verificationCode = generateVerificationCode();
    const verificationExpires = new Date(Date.now() + (EMAIL_CONFIG.VERIFICATION_CODE_EXPIRY_MINUTES * 60 * 1000));

    // Create new user (unverified)
    const result = await pool.query(
      `INSERT INTO users (student_id, email, password_hash, role, telegram_handle, email_verification_code, email_verification_expires) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) 
       RETURNING id, student_id, email, role, created_at`,
      [identifier, email, passwordHash, role, telegramHandle || null, verificationCode, verificationExpires]
    );

    const newUser = result.rows[0];

    // Log user registration
    await logSecurityEvent('user_registration', `New ${role} registered: ${identifier}`, newUser.id, { identifier, email, role }, req);

    // Send verification email
    try {
      await sendVerificationEmail(email, verificationCode, identifier);
    } catch (emailError) {
      // If email fails, delete the user and return error
      await pool.query('DELETE FROM users WHERE id = $1', [newUser.id]);
      await logSecurityEvent('registration_failed', `Email verification failed for: ${identifier}`, newUser.id, { identifier, email, role }, req);
      return res.status(500).json({ 
        error: 'Failed to send verification email. Please try again.' 
      });
    }

    res.status(201).json({
      message: 'Account created successfully! Please check your email for verification code.',
      user: {
        id: newUser.id,
        studentId: newUser.student_id,
        email: newUser.email,
        role: newUser.role,
        createdAt: newUser.created_at
      },
      requiresVerification: true
    });
  } catch (err) {
    console.error('Error creating user:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// Email verification endpoint
router.post('/verify-email', [
  body('studentId')
    .isLength({ min: 1 })
    .withMessage('Student ID is required'),
  body('verificationCode')
    .isLength({ min: 6, max: 6 })
    .withMessage('Verification code must be 6 digits')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    const { studentId, verificationCode } = req.body;

    const result = await pool.query(
      'SELECT id, student_id, email, email_verification_code, email_verification_expires, email_verified FROM users WHERE student_id = $1',
      [studentId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];

    if (user.email_verified) {
      return res.status(400).json({ error: 'Email is already verified' });
    }

    if (user.email_verification_code !== verificationCode) {
      return res.status(400).json({ error: 'Invalid verification code' });
    }

    if (new Date() > user.email_verification_expires) {
      return res.status(400).json({ error: 'Verification code has expired' });
    }

    await pool.query(
      'UPDATE users SET email_verified = true, email_verification_code = NULL, email_verification_expires = NULL WHERE id = $1',
      [user.id]
    );

          // Auto-sign up user for all mandatory events after email verification
      try {
        const mandatoryEvents = await pool.query(
          "SELECT id FROM calendar_events WHERE (event_type = 'Mandatory' OR event_type = 'mandatory') AND is_active = true"
        );
      
      for (const event of mandatoryEvents.rows) {
        await pool.query(
          'INSERT INTO event_signups (user_id, event_id) VALUES ($1, $2) ON CONFLICT (user_id, event_id) DO NOTHING',
          [user.id, event.id]
        );
      }

      await logSecurityEvent('MANDATORY_EVENTS_AUTO_SIGNUP', `Auto-signed up for ${mandatoryEvents.rows.length} mandatory events after email verification`, user.id, {
        studentId,
        mandatoryEventCount: mandatoryEvents.rows.length
      }, req);
    } catch (autoSignupError) {
      console.error('Error auto-signing up for mandatory events:', autoSignupError);
      // Don't fail verification if auto-signup fails
    }

    await logSecurityEvent('EMAIL_VERIFIED', `Email verified for user: ${studentId}`, user.id, { studentId, email: user.email }, req);

    res.json({ message: 'Email verified successfully' });
  } catch (err) {
    console.error('Error verifying email:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Resend verification email
router.post('/resend-verification', [
  body('studentId')
    .isLength({ min: 1 })
    .withMessage('Student ID is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    const { studentId } = req.body;

    const result = await pool.query(
      'SELECT id, email, email_verified FROM users WHERE student_id = $1',
      [studentId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];

    if (user.email_verified) {
      return res.status(400).json({ error: 'Email is already verified' });
    }

    const verificationCode = generateVerificationCode();
    const verificationExpires = new Date(Date.now() + (EMAIL_CONFIG.VERIFICATION_CODE_EXPIRY_MINUTES * 60 * 1000));

    await pool.query(
      'UPDATE users SET email_verification_code = $1, email_verification_expires = $2 WHERE id = $3',
      [verificationCode, verificationExpires, user.id]
    );

    await sendVerificationEmail(user.email, verificationCode, studentId);

    await logSecurityEvent('VERIFICATION_RESENT', `Verification email resent for user: ${studentId}`, user.id, { studentId, email: user.email }, req);

    res.json({ message: 'Verification code sent successfully' });
  } catch (err) {
    console.error('Error resending verification:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Forgot password endpoint - generates new password and sends via Telegram
router.post('/forgot-password', passwordResetLimiter, [
  body('studentId')
    .isLength({ min: 1 })
    .withMessage('Student ID is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    const { studentId } = req.body;

    const result = await pool.query(
      'SELECT id, email, email_verified, telegram_chat_id FROM users WHERE student_id = $1',
      [studentId]
    );

    if (result.rows.length === 0) {
      return res.json({ message: 'If the student ID exists, a new password will be sent via Telegram.' });
    }

    const user = result.rows[0];

    if (!user.email_verified) {
      return res.status(400).json({ error: 'Email must be verified before password reset' });
    }

    // Check if user has Telegram linked
    if (!user.telegram_chat_id) {
      return res.status(400).json({ 
        error: 'Password reset requires Telegram. Please contact support to link your Telegram account first.' 
      });
    }

    // Generate new temporary password
    const newPassword = generateTemporaryPassword();
    const newPasswordHash = await hashPassword(newPassword);

    // Update user's password and increment token version to invalidate existing sessions
    await pool.query(
      `UPDATE users SET 
         password_hash = $1, 
         password_changed_at = CURRENT_TIMESTAMP,
         session_token_version = session_token_version + 1 
       WHERE id = $2`,
      [newPasswordHash, user.id]
    );

    // Send new password via Telegram
    const success = await TelegramMfaService.sendNewPasswordToTelegram(user.telegram_chat_id, newPassword, studentId);
    
    if (!success) {
      await logSecurityEvent('PASSWORD_RESET_FAILED', `Failed to send new password via Telegram for: ${studentId}`, user.id, { studentId, email: user.email }, req);
      return res.status(500).json({ error: 'Failed to send new password. Please try again.' });
    }

    await logSecurityEvent('PASSWORD_RESET_COMPLETED', `New password generated and sent via Telegram for: ${studentId}`, user.id, { studentId, email: user.email }, req);

    res.json({ message: 'If the student ID exists, a new password has been sent to your Telegram account.' });
  } catch (err) {
    console.error('Error in forgot password:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Login step 1: Verify credentials and send MFA
router.post('/login', loginRateLimit, loginSlowDown, [
  body('studentId').notEmpty().withMessage('Identifier is required'),
  body('password').notEmpty().withMessage('Password is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    const { studentId, password } = req.body;

    // Check account lockout
    const lockoutStatus = await checkAccountLockout(studentId);
    if (lockoutStatus.locked) {
      await logLoginAttempt(studentId, false, `Account locked until ${lockoutStatus.lockedUntil}`, req);
      return res.status(423).json({ 
        error: `Account is locked. Try again in ${lockoutStatus.remainingMinutes} minutes.`,
        lockedUntil: lockoutStatus.lockedUntil
      });
    }

    // Find user (support both student ID and email login)
    const userResult = await pool.query(
      'SELECT id, student_id, email, password_hash, role, is_active, email_verified, session_token_version, telegram_chat_id FROM users WHERE student_id = $1 OR email = $1',
      [studentId]
    );

    if (userResult.rows.length === 0) {
      await logLoginAttempt(studentId, false, 'User not found', req);
      await incrementFailedLoginAttempts(studentId);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = userResult.rows[0];

    // Check if account is active
    if (!user.is_active) {
      await logLoginAttempt(studentId, false, 'Account inactive', req);
      return res.status(401).json({ error: 'Account is deactivated' });
    }

    // Check if email is verified
    if (!user.email_verified) {
      await logLoginAttempt(studentId, false, 'Email not verified', req);
      return res.status(401).json({ 
        error: 'Email not verified. Please verify your email before logging in.',
        requiresVerification: true
      });
    }

    // Verify password
    const isPasswordValid = await comparePassword(password, user.password_hash);
    if (!isPasswordValid) {
      await logLoginAttempt(studentId, false, 'Invalid password', req);
      await incrementFailedLoginAttempts(studentId);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Skip Telegram MFA for admin users
    if (user.role === 'admin') {
      // Admin users bypass MFA - directly create session and return token
      await resetFailedLoginAttempts(studentId);
      
      const token = await createUserSession(user);
      await logLoginAttempt(studentId, true, 'Admin login successful (MFA bypassed)', req);
      await logSecurityEvent('ADMIN_LOGIN_SUCCESS', `Admin login successful without MFA: ${studentId}`, user.id, { studentId, email: user.email }, req);
      
      return res.json({
        message: 'Login successful',
        token: token,
        user: {
          id: user.id,
          studentId: user.student_id,
          email: user.email,
          role: user.role
        }
      });
    }

    // Check if user has Telegram linked for MFA (students only)
    if (!user.telegram_chat_id) {
      return res.status(400).json({ 
        error: 'Telegram authentication required. Please link your Telegram account first.',
        requiresTelegramLink: true
      });
    }

    // Generate and send MFA code via Telegram (students only)
    const clientIp = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent') || 'Unknown';
    
    const mfaResult = await TelegramMfaService.generateAndSendMFA(studentId, clientIp, userAgent);
    
    if (!mfaResult.success) {
      await logLoginAttempt(studentId, false, `MFA generation failed: ${mfaResult.error}`, req);
      return res.status(500).json({ 
        error: 'Failed to send MFA code. Please try again or contact support.',
        details: mfaResult.error
      });
    }

    await logLoginAttempt(studentId, false, 'Credentials verified, MFA code sent', req);
    await logSecurityEvent('MFA_REQUESTED', `MFA code sent to Telegram for: ${studentId}`, user.id, { studentId, email: user.email }, req);

    res.json({
      message: 'Credentials verified. MFA code sent to your Telegram.',
      requiresMFA: true,
      studentId: user.student_id
    });

  } catch (err) {
    console.error('Error during login:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Login step 2: Verify MFA and complete login
router.post('/verify-mfa', loginRateLimit, [
  body('studentId').notEmpty().withMessage('Student ID is required'),
  body('mfaCode').isLength({ min: 7, max: 7 }).withMessage('MFA code must be 7 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    const { studentId, mfaCode } = req.body;

    // Check account lockout
    const lockoutStatus = await checkAccountLockout(studentId);
    if (lockoutStatus.locked) {
      await logLoginAttempt(studentId, false, `Account locked until ${lockoutStatus.lockedUntil}`, req);
      return res.status(423).json({ 
        error: `Account is locked. Try again in ${lockoutStatus.remainingMinutes} minutes.`,
        lockedUntil: lockoutStatus.lockedUntil
      });
    }

    // Verify MFA code
    const mfaResult = await TelegramMfaService.verifyMFA(studentId, mfaCode.toUpperCase());
    
    if (!mfaResult.success) {
      await logLoginAttempt(studentId, false, `Invalid MFA code: ${mfaResult.error}`, req);
      await incrementFailedLoginAttempts(studentId);
      return res.status(401).json({ error: 'Invalid or expired MFA code' });
    }

    // Get user details for token generation
    const userResult = await pool.query(
      'SELECT id, student_id, email, role, session_token_version FROM users WHERE id = $1 AND is_active = true',
      [mfaResult.userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: 'User not found or inactive' });
    }

    const user = userResult.rows[0];

    // Create session
    const sessionId = await createUserSession(user.id, req);

    // Generate token
    const token = generateSecureToken({
      userId: user.id,
      studentId: user.student_id,
      email: user.email,
      role: user.role,
      sessionId: sessionId,
      tokenVersion: user.session_token_version
    });

    // Reset failed login attempts
    await resetFailedLoginAttempts(studentId);

    // Update last login
    await pool.query(
      'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
      [user.id]
    );

    await logLoginAttempt(studentId, true, 'Login completed with MFA', req);
    await logSecurityEvent('USER_LOGIN_COMPLETED', `User logged in successfully with MFA: ${studentId}`, user.id, { studentId, email: user.email }, req);

    // Set cookie
    res.cookie('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: SECURITY_CONFIG.SESSION_DURATION_HOURS * 60 * 60 * 1000,
      sameSite: 'strict'
    });

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        studentId: user.student_id,
        email: user.email,
        role: user.role
      }
    });

  } catch (err) {
    console.error('Error during MFA verification:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Logout endpoint
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    // Invalidate current session
    if (req.user.sessionId) {
      await pool.query(
        'UPDATE user_sessions SET is_active = false WHERE session_id = $1',
        [req.user.sessionId]
      );
    }

    await logSecurityEvent('USER_LOGOUT', `User logged out: ${req.user.studentId}`, req.user.currentUser.id, {
      studentId: req.user.studentId,
      sessionId: req.user.sessionId
    }, req);

    // Clear cookie
    res.clearCookie('auth_token');

    res.json({ message: 'Logout successful' });
  } catch (err) {
    console.error('Error during logout:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Reset password endpoint
router.post('/reset-password', passwordResetLimiter, [
  body('token').notEmpty().withMessage('Reset token is required'),
  body('newPassword')
    .isLength({ min: 12 })
    .withMessage('Password must be at least 12 characters long')
    .matches(/[A-Z]/)
    .withMessage('Password must contain at least one uppercase letter')
    .matches(/[a-z]/)
    .withMessage('Password must contain at least one lowercase letter')
    .matches(/\d/)
    .withMessage('Password must contain at least one number')
    .matches(/[!@#$%^&*(),.?":{}|<>]/)
    .withMessage('Password must contain at least one special character')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    const { token, newPassword } = req.body;

    const result = await pool.query(
      'SELECT id, student_id, email, password_reset_token, password_reset_expires FROM users WHERE password_reset_token = $1',
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    const user = result.rows[0];

    if (new Date() > user.password_reset_expires) {
      return res.status(400).json({ error: 'Reset token has expired' });
    }

    const newPasswordHash = await hashPassword(newPassword);

    await pool.query(
      `UPDATE users SET 
         password_hash = $1, 
         password_reset_token = NULL, 
         password_reset_expires = NULL, 
         password_changed_at = CURRENT_TIMESTAMP,
         session_token_version = session_token_version + 1 
       WHERE id = $2`,
      [newPasswordHash, user.id]
    );

    await logSecurityEvent('PASSWORD_RESET_COMPLETED', `Password reset completed for user: ${user.student_id}`, user.id, {
      studentId: user.student_id,
      email: user.email
    }, req);

    res.json({ message: 'Password reset successfully' });
  } catch (err) {
    console.error('Error resetting password:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Validate reset token endpoint
router.post('/validate-reset-token', [
  body('token').notEmpty().withMessage('Reset token is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      // Consistent timing for invalid input
      await new Promise(resolve => setTimeout(resolve, 100));
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    const { token } = req.body;

    const result = await pool.query(
      'SELECT id, password_reset_expires FROM users WHERE password_reset_token = $1',
      [token]
    );

    // Add consistent timing to prevent timing attacks
    const processingTime = 100 + Math.random() * 50; // 100-150ms
    await new Promise(resolve => setTimeout(resolve, processingTime));

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired reset token', valid: false });
    }

    const user = result.rows[0];

    if (new Date() > user.password_reset_expires) {
      return res.status(400).json({ error: 'Invalid or expired reset token', valid: false });
    }

    res.json({ valid: true, message: 'Reset token is valid' });
  } catch (err) {
    console.error('Error validating reset token:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get current user info
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, student_id, email, role, telegram_handle, created_at, last_login, email_verified FROM users WHERE id = $1',
      [req.user.currentUser.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      user: result.rows[0]
    });
  } catch (err) {
    console.error('Error fetching user info:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
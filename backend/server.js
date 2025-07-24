const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const cookieParser = require('cookie-parser');
const nodemailer = require('nodemailer');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Security configuration
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

// Email configuration
const EMAIL_CONFIG = {
  VERIFICATION_CODE_EXPIRY_MINUTES: 15,
  FROM_EMAIL: process.env.EMAIL_FROM || 'noreply@dsutd2025.com',
  FROM_NAME: 'DSUTD 2025'
};

// Create email transporter
const createEmailTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD // Use App Password for Gmail
    }
  });
};

// Rate limiting for login attempts
const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per 15 minutes
  message: { error: 'Too many login attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true
});

// Slow down for login attempts
const loginSlowDown = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: 2, // Allow 2 requests per 15 minutes without delay
  delayMs: 1000, // Add 1 second delay per request after delayAfter
  skipSuccessfulRequests: true
});

// General rate limiting
const generalRateLimit = rateLimit({
  windowMs: SECURITY_CONFIG.RATE_LIMIT_WINDOW_MS,
  max: SECURITY_CONFIG.RATE_LIMIT_MAX_REQUESTS,
  message: { error: 'Too many requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false
});

// Middleware
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
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Apply general rate limiting
app.use(generalRateLimit);

// Database connection
const { Pool } = require('pg');
const e = require('express');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Enhanced middleware to verify JWT token
const authenticateToken = async (req, res, next) => {
  try {
    // Get token from Authorization header or cookie
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1] || req.cookies?.auth_token;

    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: 'dsutd2025-api',
      audience: 'dsutd2025-frontend',
      algorithms: ['HS256']
    });

    // Check if user still exists and is active
    const userResult = await pool.query(
      'SELECT id, student_id, email, is_active, session_token_version FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];

    if (!user.is_active) {
      return res.status(401).json({ error: 'Account is deactivated' });
    }

    // Check token version (for session invalidation)
    if (decoded.tokenVersion !== user.session_token_version) {
      await logSecurityEvent('TOKEN_INVALIDATED', 'Token version mismatch', user.id, {
        studentId: user.student_id,
        tokenVersion: decoded.tokenVersion,
        currentVersion: user.session_token_version
      });
      return res.status(401).json({ error: 'Session expired' });
    }

    // Verify session exists and is valid
    if (decoded.sessionId) {
      const sessionResult = await pool.query(
        'SELECT * FROM user_sessions WHERE session_id = $1 AND user_id = $2 AND is_active = true AND expires_at > NOW()',
        [decoded.sessionId, user.id]
      );

      if (sessionResult.rows.length === 0) {
        await logSecurityEvent('SESSION_INVALID', 'Invalid or expired session', user.id, {
          studentId: user.student_id,
          sessionId: decoded.sessionId
        });
        return res.status(401).json({ error: 'Session expired' });
      }

      // Update last activity
      await pool.query(
        'UPDATE user_sessions SET last_activity = NOW() WHERE session_id = $1',
        [decoded.sessionId]
      );
    }

    // Add user info to request
    req.user = {
      ...decoded,
      currentUser: user
    };

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    } else if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    } else {
      console.error('Authentication error:', error);
      return res.status(500).json({ error: 'Authentication error' });
    }
  }
};

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

const logSecurityEvent = async (eventType, eventDescription, userId = null, metadata = {}) => {
  try {
    await pool.query(
      `INSERT INTO security_events (user_id, event_type, event_description, ip_address, user_agent, metadata) 
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, eventType, eventDescription, null, null, JSON.stringify(metadata)]
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
    
    // Unlock account if lockout period has expired
    if (user.account_locked_until && new Date() >= user.account_locked_until) {
      await pool.query(
        'UPDATE users SET failed_login_attempts = 0, account_locked_until = NULL WHERE student_id = $1',
        [studentId]
      );
    }
    
    return { locked: false, failedAttempts: user.failed_login_attempts };
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

const createUserSession = async (userId, req) => {
  try {
    const sessionId = uuidv4();
    const expiresAt = new Date(Date.now() + (SECURITY_CONFIG.SESSION_DURATION_HOURS * 60 * 60 * 1000));
    const ipAddress = getClientIP(req);
    const userAgent = getUserAgent(req);
    
    await pool.query(
      `INSERT INTO user_sessions (user_id, session_id, ip_address, user_agent, expires_at) 
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, sessionId, ipAddress, userAgent, expiresAt]
    );
    
    return sessionId;
  } catch (error) {
    console.error('Error creating user session:', error);
    return null;
  }
};

const generateSecureToken = (payload) => {
  const token = jwt.sign(payload, JWT_SECRET, {
    issuer: 'dsutd2025-api',
    audience: 'dsutd2025-frontend',
    algorithm: 'HS256'
  });
  
  return token;
};

// Email utility functions
const generateVerificationCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const sendVerificationEmail = async (email, verificationCode, studentId) => {
  try {
    const transporter = createEmailTransporter();
    
    const mailOptions = {
      from: `"${EMAIL_CONFIG.FROM_NAME}" <${EMAIL_CONFIG.FROM_EMAIL}>`,
      to: email,
      subject: 'DSUTD 2025 - Email Verification',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0;">DSUTD 2025</h1>
            <p style="color: white; margin: 10px 0 0 0;">Email Verification</p>
          </div>
          
          <div style="padding: 30px; background: #f9f9f9;">
            <h2 style="color: #333; margin-bottom: 20px;">Welcome to DSUTD 2025!</h2>
            
            <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
              Thank you for signing up! To complete your registration, please verify your email address by entering the verification code below:
            </p>
            
            <div style="background: white; border: 2px solid #667eea; border-radius: 10px; padding: 20px; text-align: center; margin: 20px 0;">
              <h3 style="color: #333; margin: 0 0 10px 0;">Your Verification Code</h3>
              <div style="font-size: 32px; font-weight: bold; color: #667eea; letter-spacing: 5px; font-family: 'Courier New', monospace;">
                ${verificationCode}
              </div>
            </div>
            
            <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
              <strong>Student ID:</strong> ${studentId}<br>
              <strong>Email:</strong> ${email}
            </p>
            
            <p style="color: #999; font-size: 14px; margin-top: 30px;">
              This verification code will expire in ${EMAIL_CONFIG.VERIFICATION_CODE_EXPIRY_MINUTES} minutes.<br>
              If you didn't create this account, please ignore this email.
            </p>
          </div>
          
          <div style="background: #333; padding: 20px; text-align: center;">
            <p style="color: #999; margin: 0; font-size: 12px;">
              © 2025 DSUTD. All rights reserved.
            </p>
          </div>
        </div>
      `
    };
    
    const info = await transporter.sendMail(mailOptions);
    console.log('Verification email sent:', info.messageId);
    return true;
  } catch (error) {
    console.error('Error sending verification email:', error);
    return false;
  }
};

// Color mapping based on event type (matching your frontend expectations)
const getColorForType = (type) => {
  switch (type) {
    case 'Optional':
      return '#EF5800'; // orange
    case 'Pending':
      return '#F0DD59'; // yellow
    default:
      return '#C60003'; // red for regular
  }
};

// Test database connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Database connection error:', err);
  } else {
    console.log('Database connected successfully');
  }
});

// Routes
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to the WebApp API!' });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Get calendar events for a specific month (public events)
app.get('/api/calendar/events', async (req, res) => {
  try {
    const { year, month } = req.query;
    
    if (!year || !month) {
      return res.status(400).json({ error: 'Year and month parameters are required' });
    }

    // Create date range for the month
    const startDate = new Date(year, month - 1, 1); // month is 1-indexed from frontend
    const endDate = new Date(year, month, 0); // Last day of the month
    
    const result = await pool.query(
      `SELECT 
        ce.id,
        ce.title,
        ce.description,
        ce.event_date,
        ce.start_time,
        ce.end_time,
        ce.event_type,
        ce.color,
        ce.max_participants,
        ce.current_participants,
        CASE WHEN es.user_id IS NOT NULL THEN true ELSE false END as is_registered
       FROM calendar_events ce
       LEFT JOIN event_signups es ON ce.id = es.event_id AND es.user_id = $3
       WHERE ce.event_date >= $1 AND ce.event_date <= $2 AND ce.is_active = true
       ORDER BY ce.event_date, ce.start_time`,
      [startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0], req.user?.userId || null]
    );

    // Group events by date
    const eventsByDate = {};
    result.rows.forEach(event => {
      const dateKey = event.event_date.toISOString().split('T')[0];
      if (!eventsByDate[dateKey]) {
        eventsByDate[dateKey] = [];
      }
      
      // Format time for display (12-hour format)
      let time = '';
      if (event.start_time) {
        const [hours, minutes] = event.start_time.split(':');
        const hour = parseInt(hours, 10);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour % 12 || 12;
        time = `${displayHour}:${minutes} ${ampm}`;
      }

      // Format end time for display (12-hour format)
      let endTime = '';
      if (event.end_time) {
        const [endHours, endMinutes] = event.end_time.split(':');
        const endHour = parseInt(endHours, 10);
        const endAmpm = endHour >= 12 ? 'PM' : 'AM';
        const endDisplayHour = endHour % 12 || 12;
        endTime = `${endDisplayHour}:${endMinutes} ${endAmpm}`;
      }

      eventsByDate[dateKey].push({
        id: event.id.toString(),
        time: time,
        end_time: endTime,
        title: event.title,
        type: event.event_type, // Will be undefined if null/empty
        color: event.color || getColorForType(event.event_type) || '#94A3B8',
        description: event.description || ''
      });
    });

    res.json(eventsByDate);
  } catch (err) {
    console.error('Error fetching calendar events:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// Create new calendar event
app.post('/api/calendar/events', authenticateToken, async (req, res) => {
  try {
    const { title, description, event_date, start_time, end_time, event_type } = req.body;

    if (!title || !event_date) {
      return res.status(400).json({ error: 'Title and date are required' });
    }

    // Validate event type
    if (event_type && !['Mandatory', 'Optional', 'Pending'].includes(event_type)) {
      return res.status(400).json({ error: 'Type must be one of: Mandatory, Optional, Pending' });
    }

    // Automatically set color based on type
    const color = getColorForType(event_type);

    const result = await pool.query(
      `INSERT INTO calendar_events
       (title, description, event_date, start_time, end_time, event_type, color, user_id) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
       RETURNING *`,
      [title, description || '', event_date, start_time || null, end_time || null, event_type || 'regular', color, req.user.userId]
    );

    const newEvent = result.rows[0];
    
    // Format times for response
    let formattedTime = '';
    let formattedEndTime = '';
    
    if (newEvent.start_time) {
      const [hours, minutes] = newEvent.start_time.split(':');
      const hour = parseInt(hours, 10);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour % 12 || 12;
      formattedTime = `${displayHour}:${minutes} ${ampm}`;
    }
    
    if (newEvent.end_time) {
      const [endHours, endMinutes] = newEvent.end_time.split(':');
      const endHour = parseInt(endHours, 10);
      const endAmpm = endHour >= 12 ? 'PM' : 'AM';
      const endDisplayHour = endHour % 12 || 12;
      formattedEndTime = `${endDisplayHour}:${endMinutes} ${endAmpm}`;
    }
    
    // Return in frontend-compatible format
    res.status(201).json({
      id: newEvent.id.toString(),
      time: formattedTime,
      end_time: formattedEndTime,
      title: newEvent.title,
      type: newEvent.event_type,
      color: newEvent.color,
      description: newEvent.description
    });
  } catch (err) {
    console.error('Error creating calendar event:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// Update calendar event
app.put('/api/calendar/events/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, event_date, start_time, end_time, event_type } = req.body;
    
    // Validate event type
    if (event_type && !['Mandatory', 'Optional', 'Pending'].includes(event_type)) {
      return res.status(400).json({ error: 'Type must be one of: Mandatory, Optional, Pending' });
    }

    // Automatically set color based on type
    const color = getColorForType(event_type);

    const result = await pool.query(
      `UPDATE calendar_events 
       SET title = $1, description = $2, event_date = $3, start_time = $4, end_time = $5, event_type = $6, color = $7
       WHERE id = $8 AND user_id = $9
       RETURNING *`,
      [title, description, event_date, start_time, end_time, event_type, color, id, req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const updatedEvent = result.rows[0];
    
    // Format times for response
    let formattedTime = '';
    let formattedEndTime = '';
    
    if (updatedEvent.start_time) {
      const [hours, minutes] = updatedEvent.start_time.split(':');
      const hour = parseInt(hours, 10);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour % 12 || 12;
      formattedTime = `${displayHour}:${minutes} ${ampm}`;
    }
    
    if (updatedEvent.end_time) {
      const [endHours, endMinutes] = updatedEvent.end_time.split(':');
      const endHour = parseInt(endHours, 10);
      const endAmpm = endHour >= 12 ? 'PM' : 'AM';
      const endDisplayHour = endHour % 12 || 12;
      formattedEndTime = `${endDisplayHour}:${endMinutes} ${endAmpm}`;
    }
    
    // Return in frontend-compatible format
    res.json({
      id: updatedEvent.id.toString(),
      time: formattedTime,
      end_time: formattedEndTime,
      title: updatedEvent.title,
      type: updatedEvent.event_type,
      color: updatedEvent.color,
      description: updatedEvent.description
    });
  } catch (err) {
    console.error('Error updating calendar event:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// Delete calendar event
app.delete('/api/calendar/events/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      'DELETE FROM calendar_events WHERE id = $1 AND user_id = $2 RETURNING *',
      [id, req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    res.status(204).send();
  } catch (err) {
    console.error('Error deleting calendar event:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// Authentication Routes

// Sign up endpoint
app.post('/api/auth/signup', [
  body('studentId')
    .matches(/^100[1-9]\d{3}$/)
    .withMessage('Student ID must be in format 100XXXX where X is a digit from 1-9'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
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
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    const { studentId, password } = req.body;
    
    // Generate email from student ID
    const email = `${studentId}@mymail.sutd.edu.sg`;

    // Check if user already exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE student_id = $1 OR email = $2',
      [studentId, email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({ 
        error: 'User with this student ID or email already exists' 
      });
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Generate verification code
    const verificationCode = generateVerificationCode();
    const verificationExpires = new Date(Date.now() + (EMAIL_CONFIG.VERIFICATION_CODE_EXPIRY_MINUTES * 60 * 1000));

    // Create new user (unverified)
    const result = await pool.query(
      `INSERT INTO users (student_id, email, password_hash, email_verification_code, email_verification_expires) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING id, student_id, email, created_at`,
      [studentId, email, passwordHash, verificationCode, verificationExpires]
    );

    const newUser = result.rows[0];

    // Send verification email
    const emailSent = await sendVerificationEmail(email, verificationCode, studentId);
    
    if (!emailSent) {
      // If email fails, delete the user and return error
      await pool.query('DELETE FROM users WHERE id = $1', [newUser.id]);
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
app.post('/api/auth/verify-email', [
  body('studentId')
    .isLength({ min: 1 })
    .withMessage('Student ID is required'),
  body('verificationCode')
    .isLength({ min: 6, max: 6 })
    .withMessage('Verification code must be 6 digits')
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

    const { studentId, verificationCode } = req.body;

    // Find user by student ID
    const result = await pool.query(
      'SELECT id, student_id, email, email_verification_code, email_verification_expires, email_verified FROM users WHERE student_id = $1',
      [studentId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];

    // Check if already verified
    if (user.email_verified) {
      return res.status(400).json({ error: 'Email is already verified' });
    }

    // Check if verification code matches
    if (user.email_verification_code !== verificationCode) {
      return res.status(400).json({ error: 'Invalid verification code' });
    }

    // Check if verification code has expired
    if (new Date() > user.email_verification_expires) {
      return res.status(400).json({ error: 'Verification code has expired' });
    }

    // Mark email as verified and clear verification code
    await pool.query(
      'UPDATE users SET email_verified = true, email_verification_code = NULL, email_verification_expires = NULL WHERE id = $1',
      [user.id]
    );

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user.id, 
        studentId: user.student_id,
        email: user.email 
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Email verified successfully!',
      user: {
        id: user.id,
        studentId: user.student_id,
        email: user.email
      },
      token
    });
  } catch (err) {
    console.error('Error verifying email:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// Resend verification email endpoint
app.post('/api/auth/resend-verification', [
  body('studentId')
    .isLength({ min: 1 })
    .withMessage('Student ID is required')
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

    const { studentId } = req.body;

    // Find user by student ID
    const result = await pool.query(
      'SELECT id, student_id, email, email_verified FROM users WHERE student_id = $1',
      [studentId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];

    // Check if already verified
    if (user.email_verified) {
      return res.status(400).json({ error: 'Email is already verified' });
    }

    // Generate new verification code
    const verificationCode = generateVerificationCode();
    const verificationExpires = new Date(Date.now() + (EMAIL_CONFIG.VERIFICATION_CODE_EXPIRY_MINUTES * 60 * 1000));

    // Update user with new verification code
    await pool.query(
      'UPDATE users SET email_verification_code = $1, email_verification_expires = $2 WHERE id = $3',
      [verificationCode, verificationExpires, user.id]
    );

    // Send verification email
    const emailSent = await sendVerificationEmail(user.email, verificationCode, user.student_id);
    
    if (!emailSent) {
      return res.status(500).json({ 
        error: 'Failed to send verification email. Please try again.' 
      });
    }

    res.json({
      message: 'Verification email sent successfully!'
    });
  } catch (err) {
    console.error('Error resending verification email:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// Login endpoint with advanced security
app.post('/api/auth/login', 
  loginRateLimit,
  loginSlowDown,
  [
    body('studentId')
      .isLength({ min: 1 })
      .withMessage('Student ID is required')
      .matches(/^100[1-9]\d{3}$/)
      .withMessage('Invalid student ID format'),
    body('password')
      .isLength({ min: 1 })
      .withMessage('Password is required')
  ], 
  async (req, res) => {
    const startTime = Date.now();
    
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        await logLoginAttempt(req.body.studentId, false, 'validation_failed', req);
        return res.status(400).json({ 
          error: 'Validation failed', 
          details: errors.array() 
        });
      }

      const { studentId, password } = req.body;

      // Check account lockout status
      const lockoutStatus = await checkAccountLockout(studentId);
      if (lockoutStatus.locked) {
        await logLoginAttempt(studentId, false, 'account_locked', req);
        await logSecurityEvent('LOGIN_BLOCKED', `Account locked until ${lockoutStatus.lockedUntil}`, null, {
          studentId,
          reason: 'account_locked',
          remainingMinutes: lockoutStatus.remainingMinutes
        });
        
        return res.status(423).json({ 
          error: 'Account temporarily locked due to too many failed attempts',
          lockedUntil: lockoutStatus.lockedUntil,
          remainingMinutes: lockoutStatus.remainingMinutes
        });
      }

      // Find user by student ID with security fields
      const result = await pool.query(
        `SELECT id, student_id, email, password_hash, is_active, 
                failed_login_attempts, account_locked_until, 
                password_changed_at, require_password_change,
                two_factor_enabled, session_token_version, email_verified
         FROM users WHERE student_id = $1`,
        [studentId]
      );

      if (result.rows.length === 0) {
        await logLoginAttempt(studentId, false, 'user_not_found', req);
        await logSecurityEvent('LOGIN_FAILED', 'Login attempt with non-existent student ID', null, {
          studentId,
          reason: 'user_not_found'
        });
        
        // Add delay to prevent user enumeration
        await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));
        
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const user = result.rows[0];

      // Check if user is active
      if (!user.is_active) {
        await logLoginAttempt(studentId, false, 'account_deactivated', req);
        await logSecurityEvent('LOGIN_FAILED', 'Login attempt on deactivated account', user.id, {
          studentId,
          reason: 'account_deactivated'
        });
        
        return res.status(401).json({ error: 'Account is deactivated' });
      }

      // Check if email is verified
      if (!user.email_verified) {
        await logLoginAttempt(studentId, false, 'email_not_verified', req);
        await logSecurityEvent('LOGIN_FAILED', 'Login attempt with unverified email', user.id, {
          studentId,
          reason: 'email_not_verified'
        });
        
        return res.status(401).json({ 
          error: 'Please verify your email address before logging in',
          requiresVerification: true,
          studentId: user.student_id
        });
      }

      // Check if password change is required
      if (user.require_password_change) {
        await logLoginAttempt(studentId, false, 'password_change_required', req);
        return res.status(403).json({ 
          error: 'Password change required',
          requirePasswordChange: true
        });
      }

      // Check password expiry
      const passwordAge = Math.floor((Date.now() - new Date(user.password_changed_at).getTime()) / (1000 * 60 * 60 * 24));
      if (passwordAge > SECURITY_CONFIG.PASSWORD_EXPIRY_DAYS) {
        await logSecurityEvent('PASSWORD_EXPIRED', 'Password has expired', user.id, {
          studentId,
          passwordAge
        });
      }

      // Verify password with timing attack protection
      const isValidPassword = await bcrypt.compare(password, user.password_hash);
      
      if (!isValidPassword) {
        const failedAttempts = await incrementFailedLoginAttempts(studentId);
        await logLoginAttempt(studentId, false, 'invalid_password', req);
        await logSecurityEvent('LOGIN_FAILED', 'Invalid password attempt', user.id, {
          studentId,
          failedAttempts,
          reason: 'invalid_password'
        });

        const remainingAttempts = SECURITY_CONFIG.MAX_LOGIN_ATTEMPTS - failedAttempts;
        
        if (remainingAttempts <= 0) {
          return res.status(423).json({ 
            error: 'Account locked due to too many failed attempts',
            lockedUntil: new Date(Date.now() + (SECURITY_CONFIG.LOCKOUT_DURATION_MINUTES * 60 * 1000)),
            remainingMinutes: SECURITY_CONFIG.LOCKOUT_DURATION_MINUTES
          });
        }

        return res.status(401).json({ 
          error: 'Invalid credentials',
          remainingAttempts
        });
      }

      // Successful login - reset failed attempts
      await resetFailedLoginAttempts(studentId);
      await logLoginAttempt(studentId, true, null, req);
      await logSecurityEvent('LOGIN_SUCCESS', 'Successful login', user.id, {
        studentId,
        loginTime: new Date().toISOString()
      });

      // Create user session
      const sessionId = await createUserSession(user.id, req);

      // Update last login and session token version
      await pool.query(
        'UPDATE users SET last_login = CURRENT_TIMESTAMP, session_token_version = session_token_version + 1 WHERE id = $1',
        [user.id]
      );

      // Generate secure JWT token
      const tokenPayload = {
        userId: user.id,
        studentId: user.student_id,
        email: user.email,
        sessionId: sessionId,
        tokenVersion: user.session_token_version + 1,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + (SECURITY_CONFIG.SESSION_DURATION_HOURS * 60 * 60)
      };

      const token = generateSecureToken(tokenPayload);

      // Set secure cookie
      res.cookie('auth_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: SECURITY_CONFIG.SESSION_DURATION_HOURS * 60 * 60 * 1000
      });

      const responseTime = Date.now() - startTime;
      
      res.json({
        message: 'Login successful',
        user: {
          id: user.id,
          studentId: user.student_id,
          email: user.email
        },
        token,
        sessionExpiresIn: SECURITY_CONFIG.SESSION_DURATION_HOURS,
        requirePasswordChange: user.require_password_change,
        twoFactorEnabled: user.two_factor_enabled,
        passwordExpiresIn: Math.max(0, SECURITY_CONFIG.PASSWORD_EXPIRY_DAYS - passwordAge)
      });

    } catch (err) {
      console.error('Error during login:', err);
      await logSecurityEvent('LOGIN_ERROR', 'Login process error', null, {
        studentId: req.body.studentId,
        error: err.message
      });
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Logout endpoint
app.post('/api/auth/logout', authenticateToken, async (req, res) => {
  try {
    // Invalidate session
    if (req.user.sessionId) {
      await pool.query(
        'UPDATE user_sessions SET is_active = false WHERE session_id = $1',
        [req.user.sessionId]
      );
    }

    // Increment session token version to invalidate all tokens
    await pool.query(
      'UPDATE users SET session_token_version = session_token_version + 1 WHERE id = $1',
      [req.user.userId]
    );

    await logSecurityEvent('LOGOUT', 'User logged out', req.user.userId, {
      studentId: req.user.studentId,
      sessionId: req.user.sessionId
    });

    // Clear cookie
    res.clearCookie('auth_token');

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Error during logout:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Logout from all devices
app.post('/api/auth/logout-all', authenticateToken, async (req, res) => {
  try {
    // Invalidate all sessions for user
    await pool.query(
      'UPDATE user_sessions SET is_active = false WHERE user_id = $1',
      [req.user.userId]
    );

    // Increment session token version to invalidate all tokens
    await pool.query(
      'UPDATE users SET session_token_version = session_token_version + 1 WHERE id = $1',
      [req.user.userId]
    );

    await logSecurityEvent('LOGOUT_ALL', 'User logged out from all devices', req.user.userId, {
      studentId: req.user.studentId
    });

    // Clear cookie
    res.clearCookie('auth_token');

    res.json({ message: 'Logged out from all devices successfully' });
  } catch (error) {
    console.error('Error during logout all:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Protected route example
app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, student_id, email, created_at, last_login, password_changed_at, two_factor_enabled FROM users WHERE id = $1',
      [req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];
    
    // Calculate password expiry
    const passwordAge = Math.floor((Date.now() - new Date(user.password_changed_at).getTime()) / (1000 * 1000 * 60 * 60 * 24));
    const passwordExpiresIn = Math.max(0, SECURITY_CONFIG.PASSWORD_EXPIRY_DAYS - passwordAge);

    res.json({
      user: {
        id: user.id,
        studentId: user.student_id,
        email: user.email,
        createdAt: user.created_at,
        lastLogin: user.last_login,
        twoFactorEnabled: user.two_factor_enabled,
        passwordExpiresIn
      }
    });
  } catch (err) {
    console.error('Error fetching user profile:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// Get user profile data
app.get('/api/user/profile', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT student_id, email, password_hash FROM users WHERE id = $1',
      [req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];
    
    res.json({
      studentId: user.student_id,
      email: user.email,
      password: user.password_hash // Note: In production, you might want to exclude this or show masked version
    });
  } catch (err) {
    console.error('Error fetching user profile:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// Update user password
app.put('/api/user/update-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Validate input
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters long' });
    }

    // Get current user data
    const userResult = await pool.query(
      'SELECT password_hash FROM users WHERE id = $1',
      [req.user.userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 12);

    // Update password
    await pool.query(
      'UPDATE users SET password_hash = $1, password_changed_at = NOW(), session_token_version = session_token_version + 1 WHERE id = $2',
      [hashedNewPassword, req.user.userId]
    );

    // Invalidate all sessions for this user
    await pool.query(
      'UPDATE user_sessions SET is_active = false WHERE user_id = $1',
      [req.user.userId]
    );

    // Log the password change
    await logSecurityEvent('PASSWORD_CHANGED', 'User changed their password', req.user.userId, {
      studentId: req.user.studentId
    });

    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    console.error('Error updating password:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// Get user's calendar events count
app.get('/api/calendar/user-events-count', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT COUNT(*) as count FROM calendar_events WHERE user_id = $1',
      [req.user.userId]
    );

    res.json({ count: parseInt(result.rows[0].count) });
  } catch (err) {
    console.error('Error fetching user events count:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// Profile endpoints
app.get('/api/profile', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT student_id, email FROM users WHERE id = $1',
      [req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Transform database column names to camelCase for frontend
    const userData = {
      studentId: result.rows[0].student_id,
      email: result.rows[0].email
    };

    res.json(userData);
  } catch (err) {
    console.error('Error fetching profile:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

app.put('/api/profile/password', authenticateToken, [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters long')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg });
    }

    const { currentPassword, newPassword } = req.body;

    // Get current user
    const userResult = await pool.query(
      'SELECT password_hash FROM users WHERE id = $1',
      [req.user.userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, userResult.rows[0].password_hash);
    if (!isValidPassword) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, 12);

    // Update password
    await pool.query(
      'UPDATE users SET password_hash = $1, password_changed_at = CURRENT_TIMESTAMP, session_token_version = session_token_version + 1 WHERE id = $2',
      [newPasswordHash, req.user.userId]
    );

    // Log security event
    await logSecurityEvent('PASSWORD_CHANGED', 'User changed their password', req.user.userId, {
      ip: getClientIP(req),
      userAgent: getUserAgent(req)
    });

    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    console.error('Error updating password:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// Get user's signed up events
app.get('/api/profile/events', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
        ce.id,
        ce.title,
        ce.description,
        ce.event_date as date,
        ce.start_time as time,
        ce.event_type as type,
        es.signup_date,
        CASE 
          WHEN ce.event_date < CURRENT_DATE OR (ce.event_date = CURRENT_DATE AND ce.end_time < CURRENT_TIME) 
          THEN true 
          ELSE false 
        END as is_over
       FROM event_signups es
       JOIN calendar_events ce ON es.event_id = ce.id
       WHERE es.user_id = $1
       ORDER BY ce.event_date ASC, ce.start_time ASC`,
      [req.user.userId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching user events:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// Event signup endpoints
app.post('/api/events/:eventId/signup', authenticateToken, async (req, res) => {
  try {
    const { eventId } = req.params;

    // Check if event exists
    const eventResult = await pool.query(
      'SELECT id, title FROM calendar_events WHERE id = $1',
      [eventId]
    );

    if (eventResult.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Check if user already signed up
    const existingSignup = await pool.query(
      'SELECT id FROM event_signups WHERE user_id = $1 AND event_id = $2',
      [req.user.userId, eventId]
    );

    if (existingSignup.rows.length > 0) {
      return res.status(400).json({ error: 'Already signed up for this event' });
    }

    // Create signup
    await pool.query(
      'INSERT INTO event_signups (user_id, event_id) VALUES ($1, $2)',
      [req.user.userId, eventId]
    );

    // Log security event
    await logSecurityEvent('EVENT_SIGNUP', `User signed up for event: ${eventResult.rows[0].title}`, req.user.userId, {
      eventId: eventId,
      ip: getClientIP(req),
      userAgent: getUserAgent(req)
    });

    res.json({ message: 'Successfully signed up for event' });
  } catch (err) {
    console.error('Error signing up for event:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

app.delete('/api/events/:eventId/signup', authenticateToken, async (req, res) => {
  try {
    const { eventId } = req.params;

    // Check if signup exists
    const signupResult = await pool.query(
      'SELECT es.id, ce.title FROM event_signups es JOIN calendar_events ce ON es.event_id = ce.id WHERE es.user_id = $1 AND es.event_id = $2',
      [req.user.userId, eventId]
    );

    if (signupResult.rows.length === 0) {
      return res.status(404).json({ error: 'Signup not found' });
    }

    // Delete signup
    await pool.query(
      'DELETE FROM event_signups WHERE user_id = $1 AND event_id = $2',
      [req.user.userId, eventId]
    );

    // Log security event
    await logSecurityEvent('EVENT_CANCEL', `User cancelled signup for event: ${signupResult.rows[0].title}`, req.user.userId, {
      eventId: eventId,
      ip: getClientIP(req),
      userAgent: getUserAgent(req)
    });

    res.json({ message: 'Successfully cancelled event signup' });
  } catch (err) {
    console.error('Error cancelling event signup:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// Get event signup status for a user
app.get('/api/events/:eventId/signup-status', authenticateToken, async (req, res) => {
  try {
    const { eventId } = req.params;

    const result = await pool.query(
      'SELECT id FROM event_signups WHERE user_id = $1 AND event_id = $2',
      [req.user.userId, eventId]
    );

    res.json({ signedUp: result.rows.length > 0 });
  } catch (err) {
    console.error('Error checking signup status:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Security monitoring endpoint (protected)
app.get('/api/admin/security-events', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin (you can implement admin role checking here)
    const result = await pool.query(
      `SELECT se.*, u.student_id 
       FROM security_events se 
       LEFT JOIN users u ON se.user_id = u.id 
       ORDER BY se.created_at DESC 
       LIMIT 100`
    );

    res.json({
      events: result.rows,
      total: result.rows.length
    });
  } catch (error) {
    console.error('Error fetching security events:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Login attempts monitoring endpoint (protected)
app.get('/api/admin/login-attempts', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT la.*, u.student_id 
       FROM login_attempts la 
       LEFT JOIN users u ON la.student_id = u.student_id 
       ORDER BY la.attempt_time DESC 
       LIMIT 100`
    );

    res.json({
      attempts: result.rows,
      total: result.rows.length
    });
  } catch (error) {
    console.error('Error fetching login attempts:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Clean up expired sessions (run periodically)
const cleanupExpiredSessions = async () => {
  try {
    const result = await pool.query(
      'DELETE FROM user_sessions WHERE expires_at < NOW() OR is_active = false'
    );
    console.log(`Cleaned up ${result.rowCount} expired sessions`);
  } catch (error) {
    console.error('Error cleaning up expired sessions:', error);
  }
};

// Run cleanup every hour
setInterval(cleanupExpiredSessions, 60 * 60 * 1000);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log('Security features enabled:');
  console.log(`- Rate limiting: ${SECURITY_CONFIG.RATE_LIMIT_MAX_REQUESTS} requests per ${SECURITY_CONFIG.RATE_LIMIT_WINDOW_MS / 60000} minutes`);
  console.log(`- Login attempts: ${SECURITY_CONFIG.MAX_LOGIN_ATTEMPTS} max attempts before lockout`);
  console.log(`- Session duration: ${SECURITY_CONFIG.SESSION_DURATION_HOURS} hours`);
  console.log(`- Password expiry: ${SECURITY_CONFIG.PASSWORD_EXPIRY_DAYS} days`);
});
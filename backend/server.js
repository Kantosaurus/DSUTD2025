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
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');
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

// --- ADD MULter CONFIGURATION ---
// Configure Multer for temporary file storage
const upload = multer({ dest: 'uploads/' }); 
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)){
    fs.mkdirSync(uploadsDir, { recursive: true });
}

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
      'SELECT id, student_id, email, role, is_active, session_token_version FROM users WHERE id = $1',
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
      currentUser: user,
      role: user.role
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

// Middleware to check if user is admin
const requireAdmin = async (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
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

const generatePasswordResetToken = () => {
  return crypto.randomBytes(32).toString('hex');
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

const sendPasswordResetEmail = async (email, resetToken, studentId) => {
  try {
    const transporter = createEmailTransporter();
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
    
    const mailOptions = {
      from: `"${EMAIL_CONFIG.FROM_NAME}" <${EMAIL_CONFIG.FROM_EMAIL}>`,
      to: email,
      subject: 'DSUTD 2025 - Password Reset Request',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0;">DSUTD 2025</h1>
            <p style="color: white; margin: 10px 0 0 0;">Password Reset</p>
          </div>
          
          <div style="padding: 30px; background: #f9f9f9;">
            <h2 style="color: #333; margin-bottom: 20px;">Password Reset Request</h2>
            
            <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
              We received a request to reset your password for your DSUTD 2025 account. Click the button below to reset your password:
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                Reset Password
              </a>
            </div>
            
            <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
              <strong>Student ID:</strong> ${studentId}<br>
              <strong>Email:</strong> ${email}
            </p>
            
            <p style="color: #999; font-size: 14px; margin-top: 30px;">
              This password reset link will expire in 1 hour.<br>
              If you didn't request a password reset, please ignore this email or contact support if you have concerns.
            </p>
            
            <p style="color: #666; line-height: 1.6; margin-top: 20px;">
              If the button above doesn't work, you can copy and paste this link into your browser:<br>
              <a href="${resetUrl}" style="color: #667eea; word-break: break-all;">${resetUrl}</a>
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
    console.log('Password reset email sent:', info.messageId);
    return true;
  } catch (error) {
    console.error('Error sending password reset email:', error);
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
        to_char(ce.event_date, 'YYYY-MM-DD') as event_date_str,
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
      // Use the date string directly from the database to avoid timezone issues
      const dateKey = event.event_date_str;
      
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
    const { title, description, event_date, start_time, end_time, event_type, location, max_participants } = req.body;

    if (!title || !event_date) {
      return res.status(400).json({ error: 'Title and date are required' });
    }

    // Validate event type
    if (event_type && !['Mandatory', 'Optional', 'Pending'].includes(event_type)) {
      return res.status(400).json({ error: 'Type must be one of: Mandatory, Optional, Pending' });
    }

    // Automatically set color based on type
    const color = getColorForType(event_type);

    // Convert max_participants to number or null
    const maxParticipants = max_participants && max_participants.trim() !== '' ? parseInt(max_participants, 10) : null;

    const result = await pool.query(
      `INSERT INTO calendar_events
       (title, description, event_date, start_time, end_time, event_type, location, color, max_participants, user_id, is_active) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) 
       RETURNING *`,
      [title, description || '', event_date, start_time || null, end_time || null, event_type || 'regular', location || '', color, maxParticipants, req.user.userId, true]
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
      location: newEvent.location,
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
    const { title, description, event_date, start_time, end_time, event_type, location, max_participants } = req.body;
    
    // Validate event type
    if (event_type && !['Mandatory', 'Optional', 'Pending'].includes(event_type)) {
      return res.status(400).json({ error: 'Type must be one of: Mandatory, Optional, Pending' });
    }

    // Automatically set color based on type
    const color = getColorForType(event_type);

    // Convert max_participants to number or null
    const maxParticipants = max_participants && max_participants.trim() !== '' ? parseInt(max_participants, 10) : null;

    // Build query based on user role
    let query, params;
    if (req.user.role === 'admin') {
      // Admins can update any event
      query = `UPDATE calendar_events 
               SET title = $1, description = $2, event_date = $3, start_time = $4, end_time = $5, event_type = $6, location = $7, color = $8, max_participants = $9
               WHERE id = $10
               RETURNING *`;
      params = [title, description, event_date, start_time, end_time, event_type, location, color, maxParticipants, id];
    } else {
      // Regular users can only update their own events
      query = `UPDATE calendar_events 
               SET title = $1, description = $2, event_date = $3, start_time = $4, end_time = $5, event_type = $6, location = $7, color = $8, max_participants = $9
               WHERE id = $10 AND user_id = $11
               RETURNING *`;
      params = [title, description, event_date, start_time, end_time, event_type, location, color, maxParticipants, id, req.user.userId];
    }

    const result = await pool.query(query, params);

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
      location: updatedEvent.location,
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
    
    // Build query based on user role
    let query, params;
    if (req.user.role === 'admin') {
      // Admins can delete any event
      query = 'DELETE FROM calendar_events WHERE id = $1 RETURNING *';
      params = [id];
    } else {
      // Regular users can only delete their own events
      query = 'DELETE FROM calendar_events WHERE id = $1 AND user_id = $2 RETURNING *';
      params = [id, req.user.userId];
    }
    
    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    res.status(204).send();
  } catch (err) {
    console.error('Error deleting calendar event:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// Batch Create Calendar Events from CSV (Admin only)
app.post('/api/admin/calendar/events/batch', authenticateToken, requireAdmin, upload.single('csvFile'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'CSV file is required.' });
  }

  const filePath = req.file.path;
  const results = [];
  const errors = [];
  const createdEvents = [];
  let rowIndex = 1;

  try {
    // Parse CSV
    await new Promise((resolve, reject) => {
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', resolve)
        .on('error', reject);
    });

    console.log(`Parsed ${results.length} rows from CSV.`);

    // Process Each Row
    for (const rowData of results) {
      rowIndex++;
      try {
        const { title, description, event_date, start_time, end_time, event_type, location, max_participants } = rowData;

        if (!title || !title.trim()) {
          errors.push({ row: rowIndex, error: 'Title is required' });
          continue;
        }

        if (!event_date || !event_date.trim()) {
          errors.push({ row: rowIndex, error: 'Date is required' });
          continue;
        }

        // Basic date format check (YYYY-MM-DD expected by DB)
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(event_date.trim())) {
             errors.push({ row: rowIndex, error: 'Invalid date format. Expected YYYY-MM-DD.' });
             continue;
        }

        // Validate event type if provided
        if (event_type && !['Mandatory', 'Optional', 'Pending'].includes(event_type)) {
             errors.push({ row: rowIndex, error: 'Type must be one of: Mandatory, Optional, Pending' });
             continue;
        }

        // Prepare Data for Insertion
        const color = getColorForType(event_type);
        const maxParticipants = max_participants && max_participants.toString().trim() !== '' ? parseInt(max_participants, 10) : null;
        // Ensure times are null if empty/whitespace
        const startTime = start_time && start_time.trim() !== '' ? start_time.trim() : null;
        const endTime = end_time && end_time.trim() !== '' ? end_time.trim() : null;
        const descriptionText = description || '';
        const locationText = location || '';
        const eventTypeText = event_type || 'regular';

        // Insert into Database
        // Using a transaction might be safer for batch operations, but for simplicity, individual inserts
        const insertResult = await pool.query(
          `INSERT INTO calendar_events
           (title, description, event_date, start_time, end_time, event_type, location, color, max_participants, user_id, is_active)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
           RETURNING *`,
          [title.trim(), descriptionText, event_date.trim(), startTime, endTime, eventTypeText, locationText, color, maxParticipants, req.user.userId, true]
        );

        const newEvent = insertResult.rows[0];

        // Format for Response (match single event creation response)
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

        createdEvents.push({
          id: newEvent.id.toString(),
          time: formattedTime,
          end_time: formattedEndTime,
          title: newEvent.title,
          type: newEvent.event_type,
          location: newEvent.location,
          color: newEvent.color,
          description: newEvent.description
          // Optionally add row number for reference: , csv_row: rowIndex
        });

      } catch (rowError) {
        console.error(`Error processing row ${rowIndex}:`, rowError);
        errors.push({ row: rowIndex, error: rowError.message || 'Internal processing error for this row' });
        // Continue processing other rows
      }
    }

    // Cleanup: Delete the temporary uploaded file
    try {
        fs.unlinkSync(filePath);
    } catch (unlinkError) {
        console.warn(`Could not delete temporary file ${filePath}:`, unlinkError.message);
    }


    // Respond with Summary
    res.status(201).json({
      message: `Batch processing complete. ${createdEvents.length} events created, ${errors.length} errors.`,
      createdEvents: createdEvents,
      errors: errors
    });

  } catch (err) {
    console.error('Error during batch event creation:', err);

    // Attempt cleanup even if processing failed
    try {
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    } catch (cleanupError) {
        console.warn(`Could not delete temporary file ${filePath} after error:`, cleanupError.message);
    }

    // Provide a general error response
    res.status(500).json({
      error: 'Internal server error during batch processing',
      details: err.message || 'An unexpected error occurred while processing the CSV file.'
      // Consider omitting detailed errors in production
    });
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

    // Log user registration
    await logSecurityEvent('user_registration', `New user registered: ${studentId}`, newUser.id, { studentId, email }, req);

    // Send verification email
    const emailSent = await sendVerificationEmail(email, verificationCode, studentId);
    
    if (!emailSent) {
      // If email fails, delete the user and return error
      await pool.query('DELETE FROM users WHERE id = $1', [newUser.id]);
      await logSecurityEvent('registration_failed', `Email verification failed for: ${studentId}`, newUser.id, { studentId, email }, req);
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

    // Log email verification
    await logSecurityEvent('email_verified', `Email verified for user: ${user.student_id}`, user.id, { studentId: user.student_id, email: user.email }, req);

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

// Forgot password endpoint
app.post('/api/auth/forgot-password', [
  body('studentId')
    .isLength({ min: 1 })
    .withMessage('Student ID is required')
    .matches(/^100[1-9]\d{3}$/)
    .withMessage('Invalid student ID format')
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
      // Don't reveal if user exists or not for security
      return res.json({
        message: 'If an account with this student ID exists, a password reset email has been sent.'
      });
    }

    const user = result.rows[0];

    // Check if email is verified
    if (!user.email_verified) {
      return res.status(400).json({ 
        error: 'Please verify your email address before requesting a password reset' 
      });
    }

    // Generate password reset token
    const resetToken = generatePasswordResetToken();
    const resetExpires = new Date(Date.now() + (60 * 60 * 1000)); // 1 hour

    // Update user with reset token
    await pool.query(
      'UPDATE users SET password_reset_token = $1, password_reset_expires = $2 WHERE id = $3',
      [resetToken, resetExpires, user.id]
    );

    // Send password reset email
    const emailSent = await sendPasswordResetEmail(user.email, resetToken, user.student_id);
    
    if (!emailSent) {
      return res.status(500).json({ 
        error: 'Failed to send password reset email. Please try again.' 
      });
    }

    // Log security event
    await logSecurityEvent('PASSWORD_RESET_REQUESTED', `Password reset requested for: ${studentId}`, user.id, {
      studentId,
      email: user.email
    }, req);

    res.json({
      message: 'If an account with this student ID exists, a password reset email has been sent.'
    });
  } catch (err) {
    console.error('Error processing forgot password request:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// Reset password endpoint
app.post('/api/auth/reset-password', [
  body('token')
    .isLength({ min: 1 })
    .withMessage('Reset token is required'),
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

    const { token, password } = req.body;

    // Find user by reset token
    const result = await pool.query(
      'SELECT id, student_id, email, password_reset_expires FROM users WHERE password_reset_token = $1',
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    const user = result.rows[0];

    // Check if token has expired
    if (new Date() > user.password_reset_expires) {
      return res.status(400).json({ error: 'Reset token has expired' });
    }

    // Hash new password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Update user password and clear reset token
    await pool.query(
      'UPDATE users SET password_hash = $1, password_reset_token = NULL, password_reset_expires = NULL, password_changed_at = CURRENT_TIMESTAMP, session_token_version = session_token_version + 1 WHERE id = $2',
      [passwordHash, user.id]
    );

    // Log security event
    await logSecurityEvent('PASSWORD_RESET_SUCCESS', `Password reset successful for: ${user.student_id}`, user.id, {
      studentId: user.student_id,
      email: user.email
    }, req);

    res.json({
      message: 'Password reset successfully! You can now log in with your new password.'
    });
  } catch (err) {
    console.error('Error resetting password:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// Validate reset token endpoint
app.post('/api/auth/validate-reset-token', [
  body('token')
    .isLength({ min: 1 })
    .withMessage('Reset token is required')
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

    const { token } = req.body;

    // Find user by reset token
    const result = await pool.query(
      'SELECT id, password_reset_expires FROM users WHERE password_reset_token = $1',
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid reset token' });
    }

    const user = result.rows[0];

    // Check if token has expired
    if (new Date() > user.password_reset_expires) {
      return res.status(400).json({ error: 'Reset token has expired' });
    }

    res.json({ valid: true });
  } catch (err) {
    console.error('Error validating reset token:', err);
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
      'SELECT id, student_id, email, role, created_at, last_login, password_changed_at, two_factor_enabled FROM users WHERE id = $1',
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
        role: user.role,
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

    // Update current_participants count
    await pool.query(
      'UPDATE calendar_events SET current_participants = current_participants + 1 WHERE id = $1',
      [eventId]
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

    // Update current_participants count
    await pool.query(
      'UPDATE calendar_events SET current_participants = GREATEST(current_participants - 1, 0) WHERE id = $1',
      [eventId]
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

// Get all calendar events (admin only)
app.get('/api/admin/calendar/events', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT ce.*, u.student_id as creator_student_id, u.email as creator_email,
              COALESCE(signup_counts.signup_count, 0) as current_participants
       FROM calendar_events ce
       LEFT JOIN users u ON ce.user_id = u.id
       LEFT JOIN (
         SELECT event_id, COUNT(*) as signup_count 
         FROM event_signups 
         GROUP BY event_id
       ) signup_counts ON ce.id = signup_counts.event_id
       ORDER BY ce.event_date DESC, ce.start_time ASC`
    );

    const events = result.rows.map(event => ({
      id: event.id.toString(),
      title: event.title,
      description: event.description,
      event_date: event.event_date,
      start_time: event.start_time,
      end_time: event.end_time,
      event_type: event.event_type,
      location: event.location,
      color: event.color,
      max_participants: event.max_participants,
      current_participants: event.current_participants,
      creator_student_id: event.creator_student_id,
      creator_email: event.creator_email,
      created_at: event.created_at,
      updated_at: event.updated_at
    }));

    res.json({
      events,
      total: events.length
    });
  } catch (err) {
    console.error('Error fetching all calendar events:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// Security monitoring endpoint (protected)
app.get('/api/admin/security-events', authenticateToken, requireAdmin, async (req, res) => {
  try {
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
app.get('/api/admin/login-attempts', authenticateToken, requireAdmin, async (req, res) => {
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

// Comprehensive activity logs endpoint (protected)
app.get('/api/admin/activity-logs', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 50, type } = req.query;
    const offset = (page - 1) * limit;
    
    let whereClause = '';
    let params = [];
    
    if (type) {
      whereClause = 'WHERE se.event_type = $1';
      params.push(type);
    }
    
    const result = await pool.query(
      `SELECT se.*, u.student_id, u.email
       FROM security_events se 
       LEFT JOIN users u ON se.user_id = u.id 
       ${whereClause}
       ORDER BY se.created_at DESC 
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );

    const countResult = await pool.query(
      `SELECT COUNT(*) as total
       FROM security_events se 
       LEFT JOIN users u ON se.user_id = u.id 
       ${whereClause}`,
      params
    );

    res.json({
      logs: result.rows,
      total: parseInt(countResult.rows[0].total),
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(countResult.rows[0].total / limit)
    });
  } catch (error) {
    console.error('Error fetching activity logs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// User registration activity endpoint (protected)
app.get('/api/admin/user-registrations', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;
    
    const result = await pool.query(
      `SELECT u.id, u.student_id, u.email, u.role, u.created_at, u.last_login, u.is_active,
              COUNT(es.id) as total_signups
       FROM users u
       LEFT JOIN event_signups es ON u.id = es.user_id
       GROUP BY u.id, u.student_id, u.email, u.role, u.created_at, u.last_login, u.is_active
       ORDER BY u.created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    const countResult = await pool.query('SELECT COUNT(*) as total FROM users');

    res.json({
      users: result.rows,
      total: parseInt(countResult.rows[0].total),
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(countResult.rows[0].total / limit)
    });
  } catch (error) {
    console.error('Error fetching user registrations:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Event signup activity endpoint (protected)
app.get('/api/admin/event-signups', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;
    
    const result = await pool.query(
      `SELECT es.*, u.student_id, u.email, ce.title as event_title, ce.event_date, ce.event_type
       FROM event_signups es
       JOIN users u ON es.user_id = u.id
       JOIN calendar_events ce ON es.event_id = ce.id
       ORDER BY es.signup_date DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    const countResult = await pool.query('SELECT COUNT(*) as total FROM event_signups');

    res.json({
      signups: result.rows,
      total: parseInt(countResult.rows[0].total),
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(countResult.rows[0].total / limit)
    });
  } catch (error) {
    console.error('Error fetching event signups:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Dashboard statistics endpoint (protected)
app.get('/api/admin/dashboard-stats', authenticateToken, requireAdmin, async (req, res) => {
  try {
    // Get total users
    const usersResult = await pool.query('SELECT COUNT(*) as total FROM users');
    const totalUsers = parseInt(usersResult.rows[0].total);
    
    // Get users by role
    const roleResult = await pool.query(
      'SELECT role, COUNT(*) as count FROM users GROUP BY role'
    );
    const usersByRole = roleResult.rows.reduce((acc, row) => {
      acc[row.role] = parseInt(row.count);
      return acc;
    }, {});
    
    // Get total events
    const eventsResult = await pool.query('SELECT COUNT(*) as total FROM calendar_events');
    const totalEvents = parseInt(eventsResult.rows[0].total);
    
    // Get events by status (upcoming, ongoing, past)
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    
    const upcomingEventsResult = await pool.query(
      'SELECT COUNT(*) as count FROM calendar_events WHERE event_date > $1',
      [today]
    );
    const upcomingEvents = parseInt(upcomingEventsResult.rows[0].count);
    
    const pastEventsResult = await pool.query(
      'SELECT COUNT(*) as count FROM calendar_events WHERE event_date < $1',
      [today]
    );
    const pastEvents = parseInt(pastEventsResult.rows[0].count);
    
    const ongoingEventsResult = await pool.query(
      'SELECT COUNT(*) as count FROM calendar_events WHERE event_date = $1',
      [today]
    );
    const ongoingEvents = parseInt(ongoingEventsResult.rows[0].count);
    
    // Get current event
    const currentEventResult = await pool.query(
      `SELECT ce.*, u.student_id as creator_student_id
       FROM calendar_events ce
       LEFT JOIN users u ON ce.user_id = u.id
       WHERE ce.event_date = $1
       ORDER BY ce.start_time ASC
       LIMIT 1`,
      [today]
    );
    const currentEvent = currentEventResult.rows[0] || null;
    
    // Get next event
    const nextEventResult = await pool.query(
      `SELECT ce.*, u.student_id as creator_student_id
       FROM calendar_events ce
       LEFT JOIN users u ON ce.user_id = u.id
       WHERE ce.event_date > $1
       ORDER BY ce.event_date ASC, ce.start_time ASC
       LIMIT 1`,
      [today]
    );
    const nextEvent = nextEventResult.rows[0] || null;
    
    // Get total signups
    const signupsResult = await pool.query('SELECT COUNT(*) as total FROM event_signups');
    const totalSignups = parseInt(signupsResult.rows[0].total);
    

    
    // Get recent activity (last 7 days)
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const recentActivityResult = await pool.query(
      'SELECT COUNT(*) as count FROM security_events WHERE created_at >= $1',
      [sevenDaysAgo]
    );
    const recentActivity = parseInt(recentActivityResult.rows[0].count);
    
    // Get failed login attempts (last 24 hours)
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const failedLoginsResult = await pool.query(
      'SELECT COUNT(*) as count FROM login_attempts WHERE success = false AND attempt_time >= $1',
      [oneDayAgo]
    );
    const failedLogins = parseInt(failedLoginsResult.rows[0].count);

    res.json({
      users: {
        total: totalUsers,
        byRole: usersByRole
      },
      events: {
        total: totalEvents,
        upcoming: upcomingEvents,
        ongoing: ongoingEvents,
        past: pastEvents
      },
      currentEvent,
      nextEvent,
      signups: {
        total: totalSignups
      },
      activity: {
        recent: recentActivity,
        failedLogins
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
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

// 404 handler - must be last
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log('Security features enabled:');
  console.log(`- Rate limiting: ${SECURITY_CONFIG.RATE_LIMIT_MAX_REQUESTS} requests per ${SECURITY_CONFIG.RATE_LIMIT_WINDOW_MS / 60000} minutes`);
  console.log(`- Login attempts: ${SECURITY_CONFIG.MAX_LOGIN_ATTEMPTS} max attempts before lockout`);
  console.log(`- Session duration: ${SECURITY_CONFIG.SESSION_DURATION_HOURS} hours`);
  console.log(`- Password expiry: ${SECURITY_CONFIG.PASSWORD_EXPIRY_DAYS} days`);
});
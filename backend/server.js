const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Import configurations
const SECURITY_CONFIG = require('./config/security');
const EMAIL_CONFIG = require('./config/email');

// Import middleware
const { generalRateLimit } = require('./middleware/rateLimiting');

// Import routes
const authRoutes = require('./routes/auth');
const calendarRoutes = require('./routes/calendar');
const adminRoutes = require('./routes/admin');
const userRoutes = require('./routes/user');
const eventRoutes = require('./routes/events');

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
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

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// General middleware
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Configure Multer for temporary file storage
const upload = multer({ dest: 'uploads/' }); 
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)){
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Apply general rate limiting
app.use(generalRateLimit);

// Health check endpoints
app.get('/', (req, res) => {
  res.json({ message: 'DSUTD 2025 API Server is running', version: '1.0.0' });
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Route handlers
app.use('/api/auth', authRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/user', userRoutes);
app.use('/api/events', eventRoutes);

// Additional legacy routes that need to be preserved
const { authenticateToken, requireAdmin } = require('./middleware/auth');
const { pool } = require('./config/database');

// Legacy profile routes (keeping for compatibility)
app.get('/api/profile', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, student_id, email, role, created_at, last_login, email_verified FROM users WHERE id = $1',
      [req.user.currentUser.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      user: result.rows[0]
    });
  } catch (err) {
    console.error('Error fetching user profile:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Legacy password update route (keeping for compatibility)
const { body, validationResult } = require('express-validator');
const { hashPassword, comparePassword } = require('./utils/auth');
const { logSecurityEvent } = require('./utils/security');

app.put('/api/profile/password', authenticateToken, [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
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

    const { currentPassword, newPassword } = req.body;
    const userId = req.user.currentUser.id;

    const userResult = await pool.query(
      'SELECT password_hash FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const isCurrentPasswordValid = await comparePassword(currentPassword, userResult.rows[0].password_hash);
    if (!isCurrentPasswordValid) {
      await logSecurityEvent('PASSWORD_CHANGE_FAILED', 'Invalid current password provided', userId, {
        studentId: req.user.currentUser.student_id
      }, req);
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    const newPasswordHash = await hashPassword(newPassword);

    await pool.query(
      'UPDATE users SET password_hash = $1, password_changed_at = CURRENT_TIMESTAMP, session_token_version = session_token_version + 1 WHERE id = $2',
      [newPasswordHash, userId]
    );

    await logSecurityEvent('PASSWORD_CHANGED', 'User password changed successfully', userId, {
      studentId: req.user.currentUser.student_id
    }, req);

    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    console.error('Error updating password:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Legacy calendar user events count route
app.get('/api/calendar/user-events-count', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT COUNT(*) as count FROM event_signups WHERE user_id = $1',
      [req.user.currentUser.id]
    );

    res.json({
      eventCount: parseInt(result.rows[0].count)
    });
  } catch (err) {
    console.error('Error fetching user event count:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Legacy profile events route
app.get('/api/profile/events', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT ce.*, es.signup_date
      FROM calendar_events ce
      INNER JOIN event_signups es ON ce.id = es.event_id
      WHERE es.user_id = $1
      ORDER BY ce.event_date ASC, ce.start_time ASC
    `, [req.user.currentUser.id]);

    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching user events:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Legacy admin routes for compatibility
app.get('/api/admin/user-registrations', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;

    const result = await pool.query(`
      SELECT id, student_id, email, role, created_at, last_login, email_verified, is_active
      FROM users
      ORDER BY created_at DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);
    
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching user registrations:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/admin/event-signups', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;

    const result = await pool.query(`
      SELECT 
        es.*,
        u.student_id,
        u.email,
        ce.title as event_title,
        ce.event_date
      FROM event_signups es
      JOIN users u ON es.user_id = u.id
      JOIN calendar_events ce ON es.event_id = ce.id
      ORDER BY es.signup_date DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);
    
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching event signups:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/admin/activity-logs', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;

    const result = await pool.query(`
      SELECT 
        se.*,
        u.student_id,
        u.email
      FROM security_events se
      LEFT JOIN users u ON se.user_id = u.id
      WHERE se.event_type IN ('USER_LOGIN', 'USER_LOGOUT', 'EVENT_SIGNUP', 'EVENT_SIGNUP_CANCELLED', 'PASSWORD_CHANGED')
      ORDER BY se.created_at DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);
    
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching activity logs:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Logout all sessions
app.post('/api/auth/logout-all', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.currentUser.id;

    // Invalidate all user sessions
    await pool.query(
      'UPDATE user_sessions SET is_active = false WHERE user_id = $1',
      [userId]
    );

    // Increment token version to invalidate all tokens
    await pool.query(
      'UPDATE users SET session_token_version = session_token_version + 1 WHERE id = $1',
      [userId]
    );

    await logSecurityEvent('ALL_SESSIONS_LOGOUT', `All sessions logged out for user: ${req.user.studentId}`, userId, {
      studentId: req.user.studentId
    }, req);

    res.clearCookie('auth_token');
    res.json({ message: 'All sessions logged out successfully' });
  } catch (err) {
    console.error('Error during logout all:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
});

module.exports = app;
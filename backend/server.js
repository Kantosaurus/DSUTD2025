const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const csrf = require('csrf');
require('dotenv').config();

// Import configurations
const SECURITY_CONFIG = require('./config/security');
const EMAIL_CONFIG = require('./config/email');

// Import middleware
const { generalRateLimit, searchLimiter, passwordResetLimiter, apiLimiter } = require('./middleware/rateLimiting');

// Import routes
const authRoutes = require('./routes/auth');
const calendarRoutes = require('./routes/calendar');
const adminRoutes = require('./routes/admin');
const userRoutes = require('./routes/user');
const eventRoutes = require('./routes/events');
const survivalKitRoutes = require('./routes/survival-kit');

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize CSRF protection
const csrfTokens = csrf();

// CSRF middleware
const csrfProtection = (req, res, next) => {
  // Skip CSRF for GET requests and authentication endpoints
  if (req.method === 'GET' || req.path.startsWith('/api/auth/login') || req.path.startsWith('/api/auth/signup')) {
    return next();
  }

  const token = req.headers['x-csrf-token'] || req.body._csrf;
  const secret = req.session?.csrfSecret;

  if (!secret || !token || !csrfTokens.verify(secret, token)) {
    return res.status(403).json({ error: 'Invalid CSRF token' });
  }

  next();
};

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'sha256-47DEQpj8HBSa+/TImW+5JCeuQeRkm5NMpJWZG3hSuFU='"], // Specific hash for inline styles
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", process.env.FRONTEND_URL || 'http://localhost:3000'],
      fontSrc: ["'self'", "https:", "data:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
    },
  },
  crossOriginOpenerPolicy: { policy: "same-origin" },
  crossOriginResourcePolicy: { policy: "same-origin" },
  referrerPolicy: { policy: "no-referrer" },
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

// Configure Multer for secure file storage
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 1 // Only allow 1 file per request
  },
  fileFilter: (req, file, cb) => {
    // Only allow CSV files for admin uploads
    const allowedTypes = ['text/csv', 'application/csv'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'), false);
    }
  }
}); 

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
app.use('/api/survival-kit', survivalKitRoutes);

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

// Search endpoint
app.get('/api/search', authenticateToken, searchLimiter, async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || q.trim().length < 2) {
      return res.json({ results: [] });
    }

    // Sanitize search input to prevent SQL injection
    const sanitizedQuery = q.trim().toLowerCase().replace(/[%_\\]/g, '\\$&');
    const searchTerm = `%${sanitizedQuery}%`;
    
    // Search calendar events
    const eventsQuery = `
      SELECT 
        'event' as type,
        id,
        title,
        description,
        event_date,
        start_time,
        end_time,
        event_type,
        location,
        color
      FROM calendar_events
      WHERE is_active = true AND (
        LOWER(title) LIKE $1 OR 
        LOWER(description) LIKE $1 OR 
        LOWER(event_type) LIKE $1 OR 
        LOWER(location) LIKE $1
      )
      ORDER BY 
        CASE 
          WHEN LOWER(title) LIKE $1 THEN 1
          WHEN LOWER(description) LIKE $1 THEN 2
          ELSE 3
        END,
        event_date ASC
      LIMIT 10
    `;

    // Search survival kit items
    const survivalKitQuery = `
      SELECT 
        'survival_kit' as type,
        sk.id,
        sk.title,
        sk.content as description,
        sk.image_url,
        COALESCE(
          JSON_AGG(
            JSON_BUILD_OBJECT(
              'id', skr.id,
              'title', skr.title,
              'description', skr.description
            ) ORDER BY skr.order_index
          ) FILTER (WHERE skr.id IS NOT NULL), 
          '[]'::json
        ) as resources
      FROM survival_kit_items sk
      LEFT JOIN survival_kit_resources skr ON sk.id = skr.survival_kit_item_id
      WHERE sk.is_active = true AND (
        LOWER(sk.title) LIKE $1 OR 
        LOWER(sk.content) LIKE $1
      )
      GROUP BY sk.id, sk.title, sk.content, sk.image_url, sk.order_index
      ORDER BY 
        CASE 
          WHEN LOWER(sk.title) LIKE $1 THEN 1
          ELSE 2
        END,
        sk.order_index ASC
      LIMIT 10
    `;

    // Search survival kit resources
    const resourcesQuery = `
      SELECT 
        'survival_resource' as type,
        skr.id,
        skr.title,
        skr.description,
        sk.title as parent_title,
        sk.id as parent_id
      FROM survival_kit_resources skr
      JOIN survival_kit_items sk ON skr.survival_kit_item_id = sk.id
      WHERE sk.is_active = true AND (
        LOWER(skr.title) LIKE $1 OR 
        LOWER(skr.description) LIKE $1
      )
      ORDER BY 
        CASE 
          WHEN LOWER(skr.title) LIKE $1 THEN 1
          ELSE 2
        END,
        skr.order_index ASC
      LIMIT 10
    `;

    const [eventsResult, survivalKitResult, resourcesResult] = await Promise.all([
      pool.query(eventsQuery, [searchTerm]),
      pool.query(survivalKitQuery, [searchTerm]),
      pool.query(resourcesQuery, [searchTerm])
    ]);

    const results = [
      ...eventsResult.rows,
      ...survivalKitResult.rows,
      ...resourcesResult.rows
    ];

    res.json({ 
      results,
      query: q,
      totalFound: results.length
    });
  } catch (err) {
    console.error('Error during search:', err);
    // Don't leak error details in production
    const errorMessage = process.env.NODE_ENV === 'production' 
      ? 'Search service temporarily unavailable' 
      : 'Internal server error';
    res.status(500).json({ error: errorMessage });
  }
});

// Legacy admin routes removed - now handled by admin.js routes

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
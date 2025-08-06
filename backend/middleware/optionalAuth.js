const jwt = require('jsonwebtoken');
const { pool, JWT_SECRET } = require('../config/database');

// Optional authentication middleware - doesn't require auth but sets user if authenticated
const optionalAuth = async (req, res, next) => {
  try {
    // Get token from Authorization header or cookie
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1] || req.cookies?.auth_token;

    if (!token) {
      // No token provided, continue without user
      req.user = null;
      return next();
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

    if (userResult.rows.length === 0 || !userResult.rows[0].is_active) {
      // User doesn't exist or is inactive, continue without user
      req.user = null;
      return next();
    }

    const user = userResult.rows[0];

    // Check token version (for session invalidation)
    if (decoded.tokenVersion !== user.session_token_version) {
      // Token version mismatch, continue without user
      req.user = null;
      return next();
    }

    // Verify session exists and is valid if sessionId is present
    if (decoded.sessionId) {
      const sessionResult = await pool.query(
        'SELECT * FROM user_sessions WHERE session_id = $1 AND user_id = $2 AND is_active = true AND expires_at > NOW()',
        [decoded.sessionId, user.id]
      );

      if (sessionResult.rows.length === 0) {
        // Session invalid, continue without user
        req.user = null;
        return next();
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
    // Any error in authentication, continue without user
    req.user = null;
    next();
  }
};

module.exports = { optionalAuth };
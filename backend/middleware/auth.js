const jwt = require('jsonwebtoken');
const { pool, JWT_SECRET } = require('../config/database');
const { logSecurityEvent } = require('../utils/security');

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

// Middleware to check if user is club or admin (for event management)
const requireClubOrAdmin = async (req, res, next) => {
  if (!req.user || !['admin', 'club'].includes(req.user.role)) {
    return res.status(403).json({ 
      error: 'Club or admin access required',
      requiredRoles: ['admin', 'club'],
      userRole: req.user?.role || 'none'
    });
  }
  next();
};

// Middleware to check if user is admin or club admin (higher permissions)
const requireAdminOrClubAdmin = async (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    // For now, only admin can approve/reject events
    // Later we can add club admin role if needed
    return res.status(403).json({ error: 'Admin access required for this action' });
  }
  next();
};

module.exports = {
  authenticateToken,
  requireAdmin,
  requireClubOrAdmin,
  requireAdminOrClubAdmin
};
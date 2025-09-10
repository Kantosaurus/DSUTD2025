const { pool } = require('../config/database');
const { logSecurityEvent } = require('../utils/security');

// Middleware to check if user has analytics-only restrictions
const checkAnalyticsPermissions = async (req, res, next) => {
  try {
    const userId = req.user.currentUser.id;
    
    // Get user metadata to check access level
    const result = await pool.query(
      'SELECT user_metadata FROM users WHERE id = $1',
      [userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const userMetadata = result.rows[0].user_metadata || {};
    const accessLevel = userMetadata.access_level;
    
    // Add permission info to request object
    req.user.accessLevel = accessLevel;
    req.user.permissions = userMetadata.permissions || [];
    req.user.restrictions = userMetadata.restrictions || [];
    req.user.isAnalyticsOnly = accessLevel === 'analytics_readonly';
    
    next();
  } catch (error) {
    console.error('Error checking analytics permissions:', error);
    res.status(500).json({ error: 'Permission check failed' });
  }
};

// Middleware to block analytics-only users from modifying events
const requireEventModifyPermission = async (req, res, next) => {
  try {
    // First check if user has analytics permissions loaded
    await checkAnalyticsPermissions(req, res, () => {});
    
    if (req.user.isAnalyticsOnly) {
      await logSecurityEvent('UNAUTHORIZED_EVENT_MODIFY_ATTEMPT', 
        `Analytics-only user attempted to modify events: ${req.user.currentUser.student_id}`, 
        req.user.currentUser.id, {
          studentId: req.user.currentUser.student_id,
          accessLevel: req.user.accessLevel,
          attemptedAction: req.method + ' ' + req.originalUrl
        }, req);
      
      return res.status(403).json({ 
        error: 'Access denied. Analytics users can only view data.',
        code: 'ANALYTICS_READONLY_RESTRICTION',
        allowedActions: ['view_analytics', 'view_events']
      });
    }
    
    next();
  } catch (error) {
    console.error('Error checking event modify permission:', error);
    res.status(500).json({ error: 'Permission check failed' });
  }
};

// Middleware to check specific permissions
const requirePermission = (requiredPermission) => {
  return async (req, res, next) => {
    try {
      // Ensure analytics permissions are loaded
      if (!req.user.hasOwnProperty('isAnalyticsOnly')) {
        await checkAnalyticsPermissions(req, res, () => {});
      }
      
      // Check if user has the required permission
      if (req.user.permissions && req.user.permissions.includes(requiredPermission)) {
        return next();
      }
      
      // Check if action is restricted
      if (req.user.restrictions && req.user.restrictions.some(restriction => 
          restriction.includes(requiredPermission.replace('view_', '').replace('create_', '').replace('modify_', '').replace('delete_', '')))) {
        await logSecurityEvent('UNAUTHORIZED_PERMISSION_ATTEMPT', 
          `User attempted restricted action: ${requiredPermission}`, 
          req.user.currentUser.id, {
            studentId: req.user.currentUser.student_id,
            requiredPermission,
            userPermissions: req.user.permissions,
            userRestrictions: req.user.restrictions
          }, req);
        
        return res.status(403).json({ 
          error: `Access denied. Required permission: ${requiredPermission}`,
          code: 'INSUFFICIENT_PERMISSIONS',
          userPermissions: req.user.permissions
        });
      }
      
      // Default allow for admin users without specific restrictions
      if (req.user.currentUser.role === 'admin' && !req.user.isAnalyticsOnly) {
        return next();
      }
      
      return res.status(403).json({ 
        error: `Access denied. Required permission: ${requiredPermission}`,
        code: 'INSUFFICIENT_PERMISSIONS'
      });
    } catch (error) {
      console.error('Error checking required permission:', error);
      res.status(500).json({ error: 'Permission check failed' });
    }
  };
};

// Get user permissions info for frontend
const getUserPermissions = async (req, res, next) => {
  try {
    await checkAnalyticsPermissions(req, res, () => {});
    
    req.user.permissionInfo = {
      accessLevel: req.user.accessLevel,
      permissions: req.user.permissions,
      restrictions: req.user.restrictions,
      isAnalyticsOnly: req.user.isAnalyticsOnly,
      canModifyEvents: !req.user.isAnalyticsOnly,
      canCreateEvents: !req.user.isAnalyticsOnly,
      canDeleteEvents: !req.user.isAnalyticsOnly,
      canViewAnalytics: req.user.permissions.includes('view_analytics') || req.user.currentUser.role === 'admin'
    };
    
    next();
  } catch (error) {
    console.error('Error getting user permissions:', error);
    res.status(500).json({ error: 'Failed to load user permissions' });
  }
};

module.exports = {
  checkAnalyticsPermissions,
  requireEventModifyPermission,
  requirePermission,
  getUserPermissions
};
const express = require('express');
const { body, validationResult } = require('express-validator');
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { logSecurityEvent } = require('../utils/security');
const { hashPassword, comparePassword } = require('../utils/auth');

const router = express.Router();

// Get user profile
router.get('/profile', authenticateToken, async (req, res) => {
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

// Update user password
router.put('/update-password', authenticateToken, [
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

    // Get current password hash
    const userResult = await pool.query(
      'SELECT password_hash FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify current password
    const isCurrentPasswordValid = await comparePassword(currentPassword, userResult.rows[0].password_hash);
    if (!isCurrentPasswordValid) {
      await logSecurityEvent('PASSWORD_CHANGE_FAILED', 'Invalid current password provided', userId, {
        studentId: req.user.currentUser.student_id
      }, req);
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    // Hash new password
    const newPasswordHash = await hashPassword(newPassword);

    // Update password
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

// Get user's event signup count
router.get('/events-count', authenticateToken, async (req, res) => {
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

// Get user's signed up events
router.get('/events', authenticateToken, async (req, res) => {
  try {
    // Set cache control headers to prevent stale data
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });

    const result = await pool.query(`
      SELECT 
        ce.id,
        ce.title,
        ce.description,
        ce.event_date as date,
        ce.start_time as time,
        ce.end_time,
        ce.event_type as type,
        ce.location,
        ce.color,
        ce.event_date < CURRENT_DATE as "isOver",
        es.signup_date
      FROM calendar_events ce
      INNER JOIN event_signups es ON ce.id = es.event_id
      WHERE es.user_id = $1 AND ce.is_active = true
      ORDER BY ce.event_date ASC, ce.start_time ASC
    `, [req.user.currentUser.id]);

    // Format the response to match the frontend interface
    const formattedEvents = result.rows.map(event => ({
      id: event.id,
      title: event.title,
      description: event.description,
      date: event.date,
      time: event.time,
      endTime: event.end_time,
      type: event.type,
      location: event.location,
      color: event.color,
      isOver: event.isOver,
      signupDate: event.signup_date,
      isMandatory: event.type === 'Mandatory' || event.type === 'mandatory'
    }));

    console.log(`Returning ${formattedEvents.length} events for user ${req.user.currentUser.student_id}`);
    res.json(formattedEvents);
  } catch (err) {
    console.error('Error fetching user events:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
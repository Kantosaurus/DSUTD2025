const express = require('express');
const { body, validationResult } = require('express-validator');
const { pool } = require('../config/database');
const { authenticateToken, requireClubOrAdmin, requireAdmin } = require('../middleware/auth');
const { logSecurityEvent } = require('../utils/security');
const telegramNotificationService = require('../services/telegramNotificationService');

const router = express.Router();

// Sign up for an event
router.post('/:eventId/signup', authenticateToken, async (req, res) => {
  try {
    const eventId = req.params.eventId;
    const userId = req.user.currentUser.id;

    // Check if event exists and get full event details for notification
    const eventResult = await pool.query(
      'SELECT id, title, description, event_date, start_time, end_time, event_type, location FROM calendar_events WHERE id = $1 AND is_active = true',
      [eventId]
    );

    if (eventResult.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const event = eventResult.rows[0];

    // Check if user is already signed up
    const existingSignupResult = await pool.query(
      'SELECT id FROM event_signups WHERE user_id = $1 AND event_id = $2',
      [userId, eventId]
    );

    if (existingSignupResult.rows.length > 0) {
      return res.status(400).json({ error: 'Already signed up for this event' });
    }

    // Sign up user for event
    await pool.query(
      'INSERT INTO event_signups (user_id, event_id) VALUES ($1, $2)',
      [userId, eventId]
    );

    await logSecurityEvent('EVENT_SIGNUP', `User signed up for event: ${event.title}`, userId, {
      eventId: eventId,
      eventTitle: event.title,
      studentId: req.user.currentUser.student_id
    }, req);

    // Send telegram notification (non-blocking)
    telegramNotificationService.sendEventSignupConfirmation(userId, event)
      .catch(error => {
        console.error('Failed to send signup confirmation telegram:', error);
        // Don't fail the API call if telegram notification fails
      });

    res.json({ message: 'Successfully signed up for event' });
  } catch (err) {
    console.error('Error signing up for event:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Cancel event signup
router.delete('/:eventId/signup', authenticateToken, async (req, res) => {
  try {
    const eventId = req.params.eventId;
    const userId = req.user.currentUser.id;

    // Check if user is signed up for the event and get full event details
    const signupResult = await pool.query(
      `SELECT es.id, ce.title, ce.description, ce.event_date, ce.start_time, ce.end_time, ce.event_type, ce.location
       FROM event_signups es 
       JOIN calendar_events ce ON es.event_id = ce.id 
       WHERE es.user_id = $1 AND es.event_id = $2`,
      [userId, eventId]
    );

    if (signupResult.rows.length === 0) {
      return res.status(404).json({ error: 'Not signed up for this event' });
    }

    const signup = signupResult.rows[0];

    // Prevent cancellation of mandatory events
    if (signup.event_type === 'Mandatory' || signup.event_type === 'mandatory') {
      return res.status(403).json({ 
        error: 'Cannot cancel signup for mandatory events',
        eventType: 'Mandatory'
      });
    }

    // Remove signup
    await pool.query(
      'DELETE FROM event_signups WHERE user_id = $1 AND event_id = $2',
      [userId, eventId]
    );

    await logSecurityEvent('EVENT_SIGNUP_CANCELLED', `User cancelled signup for event: ${signup.title}`, userId, {
      eventId: eventId,
      eventTitle: signup.title,
      eventType: signup.event_type,
      studentId: req.user.currentUser.student_id
    }, req);

    // Send telegram notification (non-blocking)
    telegramNotificationService.sendEventCancellationNotification(userId, signup)
      .catch(error => {
        console.error('Failed to send cancellation notification telegram:', error);
        // Don't fail the API call if telegram notification fails
      });

    res.json({ message: 'Successfully cancelled event signup' });
  } catch (err) {
    console.error('Error cancelling event signup:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Check signup status for an event
router.get('/:eventId/signup-status', authenticateToken, async (req, res) => {
  try {
    const eventId = req.params.eventId;
    const userId = req.user.currentUser.id;

    const result = await pool.query(
      'SELECT id, signup_date FROM event_signups WHERE user_id = $1 AND event_id = $2',
      [userId, eventId]
    );

    res.json({
      isSignedUp: result.rows.length > 0,
      signupDate: result.rows.length > 0 ? result.rows[0].signup_date : null
    });
  } catch (err) {
    console.error('Error checking signup status:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a new event (club users and admins)
router.post('/', requireClubOrAdmin, [
  body('title').trim().isLength({ min: 1, max: 255 }).withMessage('Title is required and must be under 255 characters'),
  body('description').optional().isLength({ max: 1000 }).withMessage('Description must be under 1000 characters'),
  body('event_date').isISO8601().withMessage('Valid event date is required'),
  body('start_time').matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Valid start time is required (HH:MM format)'),
  body('end_time').matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Valid end time is required (HH:MM format)'),
  body('event_type').isIn(['Mandatory', 'Optional']).withMessage('Event type must be Mandatory or Optional'),
  body('location').trim().isLength({ min: 1, max: 255 }).withMessage('Location is required and must be under 255 characters'),
  body('max_participants').optional().isInt({ min: 1 }).withMessage('Max participants must be a positive integer'),
  body('color').optional().matches(/^#[0-9A-F]{6}$/i).withMessage('Color must be a valid hex code')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    const {
      title,
      description,
      event_date,
      start_time,
      end_time,
      event_type,
      location,
      max_participants,
      color
    } = req.body;

    const userId = req.user.currentUser.id;
    const userRole = req.user.role;

    // Determine event status based on user role
    let status = 'pending';
    let approval_date = null;
    let approved_by = null;

    // Admins can create pre-approved events
    if (userRole === 'admin') {
      status = 'approved';
      approval_date = new Date();
      approved_by = userId;
    }

    // Set default color based on event type if not provided
    const eventColor = color || (event_type === 'Mandatory' ? '#C60003' : '#EF5800');

    const result = await pool.query(`
      INSERT INTO calendar_events (
        title, description, event_date, start_time, end_time, 
        event_type, location, color, max_participants, user_id,
        status, approval_date, approved_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `, [
      title, description, event_date, start_time, end_time,
      event_type, location, eventColor, max_participants, userId,
      status, approval_date, approved_by
    ]);

    await logSecurityEvent('EVENT_CREATED', `User created event: ${title}`, userId, {
      eventId: result.rows[0].id,
      eventTitle: title,
      eventStatus: status,
      studentId: req.user.currentUser.student_id,
      userRole: userRole
    }, req);

    res.status(201).json({
      message: userRole === 'admin' ? 'Event created and approved' : 'Event created and pending approval',
      event: result.rows[0],
      requiresApproval: status === 'pending'
    });
  } catch (err) {
    console.error('Error creating event:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get events created by current user
router.get('/my-events', requireClubOrAdmin, async (req, res) => {
  try {
    const userId = req.user.currentUser.id;
    const { status, limit = 50 } = req.query;

    let query = `
      SELECT ce.*, 
             COALESCE(signup_count.count, 0) as current_signups,
             approver.student_id as approver_student_id
      FROM calendar_events ce
      LEFT JOIN (
        SELECT event_id, COUNT(*) as count 
        FROM event_signups 
        GROUP BY event_id
      ) signup_count ON ce.id = signup_count.event_id
      LEFT JOIN users approver ON ce.approved_by = approver.id
      WHERE ce.user_id = $1
    `;
    
    const params = [userId];
    
    if (status && ['pending', 'approved', 'rejected'].includes(status)) {
      query += ` AND ce.status = $2`;
      params.push(status);
    }
    
    query += ` ORDER BY ce.created_at DESC LIMIT $${params.length + 1}`;
    params.push(parseInt(limit));

    const result = await pool.query(query, params);

    res.json({
      events: result.rows,
      totalCount: result.rows.length
    });
  } catch (err) {
    console.error('Error fetching user events:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get event analytics for a specific event (creator only or admin)
router.get('/:eventId/analytics', authenticateToken, async (req, res) => {
  try {
    const eventId = req.params.eventId;
    const userId = req.user.currentUser.id;
    const userRole = req.user.role;

    // Check if user can view analytics (event creator or admin)
    const eventResult = await pool.query(
      'SELECT user_id FROM calendar_events WHERE id = $1',
      [eventId]
    );

    if (eventResult.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const event = eventResult.rows[0];
    if (event.user_id !== userId && userRole !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get comprehensive event analytics
    const analyticsResult = await pool.query(`
      SELECT 
        ea.*,
        signup_details.signups
      FROM event_analytics ea
      LEFT JOIN (
        SELECT 
          es.event_id,
          JSON_AGG(
            JSON_BUILD_OBJECT(
              'user_id', u.id,
              'student_id', u.student_id,
              'email', u.email,
              'signup_date', es.signup_date
            ) ORDER BY es.signup_date
          ) as signups
        FROM event_signups es
        JOIN users u ON es.user_id = u.id
        WHERE es.event_id = $1
        GROUP BY es.event_id
      ) signup_details ON ea.id = signup_details.event_id
      WHERE ea.id = $1
    `, [eventId]);

    if (analyticsResult.rows.length === 0) {
      return res.status(404).json({ error: 'Event analytics not found' });
    }

    const analytics = analyticsResult.rows[0];
    
    res.json({
      eventId: analytics.id,
      title: analytics.title,
      description: analytics.description,
      eventDate: analytics.event_date,
      startTime: analytics.start_time,
      endTime: analytics.end_time,
      eventType: analytics.event_type,
      location: analytics.location,
      maxParticipants: analytics.max_participants,
      currentParticipants: analytics.current_participants,
      actualSignups: analytics.actual_signups,
      fillPercentage: analytics.fill_percentage,
      status: analytics.status,
      creatorId: analytics.creator_id,
      creatorStudentId: analytics.creator_student_id,
      creatorRole: analytics.creator_role,
      approvalDate: analytics.approval_date,
      approvedBy: analytics.approved_by,
      approverStudentId: analytics.approver_student_id,
      signups: analytics.signups || [],
      createdAt: analytics.created_at,
      updatedAt: analytics.updated_at
    });
  } catch (err) {
    console.error('Error fetching event analytics:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update an event (creator only or admin)
router.put('/:eventId', requireClubOrAdmin, [
  body('title').optional().trim().isLength({ min: 1, max: 255 }).withMessage('Title must be under 255 characters'),
  body('description').optional().isLength({ max: 1000 }).withMessage('Description must be under 1000 characters'),
  body('event_date').optional().isISO8601().withMessage('Valid event date is required'),
  body('start_time').optional().matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Valid start time is required (HH:MM format)'),
  body('end_time').optional().matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Valid end time is required (HH:MM format)'),
  body('event_type').optional().isIn(['Mandatory', 'Optional']).withMessage('Event type must be Mandatory or Optional'),
  body('location').optional().trim().isLength({ min: 1, max: 255 }).withMessage('Location must be under 255 characters'),
  body('max_participants').optional().isInt({ min: 1 }).withMessage('Max participants must be a positive integer'),
  body('color').optional().matches(/^#[0-9A-F]{6}$/i).withMessage('Color must be a valid hex code')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    const eventId = req.params.eventId;
    const userId = req.user.currentUser.id;
    const userRole = req.user.role;

    // Check if event exists and user can edit it
    const eventResult = await pool.query(
      'SELECT * FROM calendar_events WHERE id = $1',
      [eventId]
    );

    if (eventResult.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const event = eventResult.rows[0];
    if (event.user_id !== userId && userRole !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Build update query dynamically
    const updates = [];
    const values = [];
    let paramCount = 1;

    const updatableFields = [
      'title', 'description', 'event_date', 'start_time', 'end_time', 
      'event_type', 'location', 'max_participants', 'color'
    ];

    for (const field of updatableFields) {
      if (req.body[field] !== undefined) {
        updates.push(`${field} = $${paramCount}`);
        values.push(req.body[field]);
        paramCount++;
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    // For club users, set status back to pending for approval
    let statusUpdate = '';
    if (userRole === 'club' && event.status === 'approved') {
      statusUpdate = `, status = 'pending', approval_date = NULL, approved_by = NULL`;
    }

    values.push(eventId);
    const query = `
      UPDATE calendar_events 
      SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP${statusUpdate}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await pool.query(query, values);

    await logSecurityEvent('EVENT_UPDATED', `User updated event: ${result.rows[0].title}`, userId, {
      eventId: eventId,
      eventTitle: result.rows[0].title,
      studentId: req.user.currentUser.student_id,
      userRole: userRole,
      requiresReapproval: userRole === 'club' && event.status === 'approved'
    }, req);

    res.json({
      message: userRole === 'club' && event.status === 'approved' 
        ? 'Event updated and requires re-approval' 
        : 'Event updated successfully',
      event: result.rows[0],
      requiresApproval: result.rows[0].status === 'pending'
    });
  } catch (err) {
    console.error('Error updating event:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete an event (creator only or admin)
router.delete('/:eventId', requireClubOrAdmin, async (req, res) => {
  try {
    const eventId = req.params.eventId;
    const userId = req.user.currentUser.id;
    const userRole = req.user.role;

    // Check if event exists and user can delete it
    const eventResult = await pool.query(
      'SELECT * FROM calendar_events WHERE id = $1',
      [eventId]
    );

    if (eventResult.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const event = eventResult.rows[0];
    if (event.user_id !== userId && userRole !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Delete the event (this will cascade to event_signups due to foreign key)
    await pool.query('DELETE FROM calendar_events WHERE id = $1', [eventId]);

    await logSecurityEvent('EVENT_DELETED', `User deleted event: ${event.title}`, userId, {
      eventId: eventId,
      eventTitle: event.title,
      studentId: req.user.currentUser.student_id,
      userRole: userRole
    }, req);

    res.json({ message: 'Event deleted successfully' });
  } catch (err) {
    console.error('Error deleting event:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
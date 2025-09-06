const express = require('express');
const { body, validationResult } = require('express-validator');
const { pool } = require('../config/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { optionalAuth } = require('../middleware/optionalAuth');
const { logSecurityEvent } = require('../utils/security');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');

const router = express.Router();

// Configure Multer for temporary file storage
const upload = multer({ dest: 'uploads/' });

// Get calendar events for a specific month (public events)
router.get('/events', optionalAuth, async (req, res) => {
  try {
    const { year, month } = req.query;
    
    if (!year || !month) {
      return res.status(400).json({ error: 'Year and month parameters are required' });
    }

    // Create date range for the month
    const startDate = new Date(year, month - 1, 1); // month is 1-indexed from frontend
    const endDate = new Date(year, month, 0); // Last day of the month
    
    // First, get all events with additional info for multi-day detection
    const result = await pool.query(
      `WITH event_groups AS (
        SELECT 
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
          CASE WHEN es.user_id IS NOT NULL THEN true ELSE false END as is_registered,
          CASE WHEN ce.event_type IN ('Mandatory', 'mandatory') THEN 1 ELSE 2 END as priority_order,
          -- For now, disable multi-day event detection to show each event separately
          NULL as prev_date,
          NULL as next_date
        FROM calendar_events ce
        LEFT JOIN event_signups es ON ce.id = es.event_id AND es.user_id = $3
        WHERE ce.event_date >= $1 AND ce.event_date <= $2 AND ce.is_active = true
      )
      SELECT *,
        -- All events are treated as single-day events
        false as is_multi_day_event
      FROM event_groups
      ORDER BY event_date, priority_order, start_time`,
      [startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0], req.user?.userId || null]
    );

    // Group events by date with conflict resolution
    const eventsByDate = {};
    const conflictTracker = {}; // Track time conflicts per date
    
    result.rows.forEach(event => {
      // Use the date string directly from the database to avoid timezone issues
      const dateKey = event.event_date_str;
      
      if (!eventsByDate[dateKey]) {
        eventsByDate[dateKey] = [];
        conflictTracker[dateKey] = [];
      }
      
      const isMandatory = event.event_type === 'Mandatory' || event.event_type === 'mandatory';
      
      // Always add all events - no conflict resolution
      // Users should see all available events and make their own choices
        
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
          const [hours, minutes] = event.end_time.split(':');
          const hour = parseInt(hours, 10);
          const ampm = hour >= 12 ? 'PM' : 'AM';
          const displayHour = hour % 12 || 12;
          endTime = `${displayHour}:${minutes} ${ampm}`;
        }

      eventsByDate[dateKey].push({
        id: event.id,
        title: event.title,
        description: event.description,
        date: event.event_date_str,
        time: time,
        endTime: endTime,
        startTime: event.start_time,
        endTimeRaw: event.end_time,
        type: event.event_type,
        color: event.color || (isMandatory ? '#C60003' : '#3b82f6'),
        maxParticipants: event.max_participants,
        currentParticipants: event.current_participants || 0,
        isRegistered: event.is_registered,
        priority: isMandatory ? 'high' : 'normal',
        isMultiDay: event.is_multi_day_event || false,
        prevDate: event.prev_date ? event.prev_date.toISOString().split('T')[0] : null,
        nextDate: event.next_date ? event.next_date.toISOString().split('T')[0] : null
      });
    });

    res.json(eventsByDate);
  } catch (err) {
    console.error('Error fetching calendar events:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Helper function to get color based on event type
const getEventTypeColor = (eventType) => {
  switch (eventType) {
    case 'Mandatory':
    case 'mandatory':
      return '#C60003'; // Red
    case 'Optional':
    case 'optional':
    case 'workshop':
    case 'seminar':
    case 'social':
    case 'competition':
    case 'networking':
      return '#EF5800'; // Orange
    case 'Pending':
    case 'pending':
      return '#F0DD59'; // Yellow
    default:
      return '#EF5800'; // Default to orange for any other types
  }
};

// Create new calendar event (admin only)
router.post('/events', authenticateToken, requireAdmin, [
  body('title').notEmpty().withMessage('Title is required'),
  body('description').optional(),
  body('event_date').isISO8601().withMessage('Valid event date is required'),
  body('start_time').optional().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/).withMessage('Start time must be in HH:MM or HH:MM:SS format'),
  body('end_time').optional().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/).withMessage('End time must be in HH:MM or HH:MM:SS format'),
  body('location').optional(),
  body('event_type').isIn(['Mandatory', 'Optional', 'Pending', 'workshop', 'seminar', 'social', 'mandatory', 'optional', 'pending', 'competition', 'networking']).withMessage('Valid event type is required'),
  body('color').optional(),
  body('max_participants').optional().isInt({ min: 0 }).withMessage('Max participants must be a positive integer')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.error('Validation errors for event creation:', errors.array());
      console.error('Request body:', req.body);
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    const { title, description, event_date, start_time, end_time, location, event_type, color, max_participants } = req.body;
    
    // Auto-assign color based on event type if not provided
    const eventColor = color || getEventTypeColor(event_type);
    
    const result = await pool.query(
      `INSERT INTO calendar_events (title, description, event_date, start_time, end_time, location, event_type, color, max_participants) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
       RETURNING *`,
      [title, description, event_date, start_time, end_time, location, event_type, eventColor, max_participants || null]
    );

    // If this is a mandatory event, automatically sign up all verified users
    if (event_type === 'Mandatory' || event_type === 'mandatory') {
      try {
        const verifiedUsers = await pool.query(
          'SELECT id FROM users WHERE email_verified = true AND is_active = true'
        );
        
        for (const user of verifiedUsers.rows) {
          await pool.query(
            'INSERT INTO event_signups (user_id, event_id) VALUES ($1, $2) ON CONFLICT (user_id, event_id) DO NOTHING',
            [user.id, result.rows[0].id]
          );
        }

        await logSecurityEvent('MANDATORY_EVENT_AUTO_SIGNUP', `Auto-signed up ${verifiedUsers.rows.length} users for mandatory event: ${title}`, req.user.currentUser.id, {
          eventId: result.rows[0].id,
          eventTitle: title,
          eventDate: event_date,
          autoSignupCount: verifiedUsers.rows.length
        }, req);
      } catch (autoSignupError) {
        console.error('Error auto-signing up users for mandatory event:', autoSignupError);
        // Don't fail event creation if auto-signup fails
      }
    }

    await logSecurityEvent('CALENDAR_EVENT_CREATED', `Event created: ${title}`, req.user.currentUser.id, {
      eventId: result.rows[0].id,
      eventTitle: title,
      eventDate: event_date
    }, req);

    res.status(201).json({
      message: 'Event created successfully',
      event: result.rows[0]
    });
  } catch (err) {
    console.error('Error creating calendar event:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update calendar event (admin only)
router.put('/events/:id', authenticateToken, requireAdmin, [
  body('title').notEmpty().withMessage('Title is required'),
  body('description').optional(),
  body('event_date').isISO8601().withMessage('Valid event date is required'),
  body('start_time').optional().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/).withMessage('Start time must be in HH:MM or HH:MM:SS format'),
  body('end_time').optional().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/).withMessage('End time must be in HH:MM or HH:MM:SS format'),
  body('location').optional(),
  body('event_type').isIn(['Mandatory', 'Optional', 'Pending', 'workshop', 'seminar', 'social', 'mandatory', 'optional', 'pending', 'competition', 'networking']).withMessage('Valid event type is required'),
  body('color').optional(),
  body('max_participants').optional().isInt({ min: 0 }).withMessage('Max participants must be a positive integer')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.error('Validation errors for event update:', errors.array());
      console.error('Request body:', req.body);
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    const eventId = req.params.id;
    const { title, description, event_date, start_time, end_time, location, event_type, color, max_participants } = req.body;
    
    // Auto-assign color based on event type if not provided
    const eventColor = color || getEventTypeColor(event_type);
    
    const result = await pool.query(
      `UPDATE calendar_events 
       SET title = $1, description = $2, event_date = $3, start_time = $4, end_time = $5, 
           location = $6, event_type = $7, color = $8, max_participants = $9, updated_at = CURRENT_TIMESTAMP
       WHERE id = $10 
       RETURNING *`,
      [title, description, event_date, start_time, end_time, location, event_type, eventColor, max_participants || null, eventId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    await logSecurityEvent('CALENDAR_EVENT_UPDATED', `Event updated: ${title}`, req.user.currentUser.id, {
      eventId: eventId,
      eventTitle: title,
      eventDate: event_date
    }, req);

    res.json({
      message: 'Event updated successfully',
      event: result.rows[0]
    });
  } catch (err) {
    console.error('Error updating calendar event:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete calendar event (admin only)
router.delete('/events/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const eventId = req.params.id;
    
    const result = await pool.query('DELETE FROM calendar_events WHERE id = $1 RETURNING title', [eventId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    await logSecurityEvent('CALENDAR_EVENT_DELETED', `Event deleted: ${result.rows[0].title}`, req.user.currentUser.id, {
      eventId: eventId,
      eventTitle: result.rows[0].title
    }, req);

    res.json({ message: 'Event deleted successfully' });
  } catch (err) {
    console.error('Error deleting calendar event:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
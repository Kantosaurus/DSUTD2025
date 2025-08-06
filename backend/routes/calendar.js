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
        color: event.color || '#3b82f6',
        maxParticipants: event.max_participants,
        currentParticipants: event.current_participants || 0,
        isRegistered: event.is_registered
      });
    });

    res.json(eventsByDate);
  } catch (err) {
    console.error('Error fetching calendar events:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new calendar event (admin only)
router.post('/events', authenticateToken, requireAdmin, [
  body('title').notEmpty().withMessage('Title is required'),
  body('description').optional(),
  body('event_date').isISO8601().withMessage('Valid event date is required'),
  body('start_time').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Valid start time is required (HH:MM)'),
  body('end_time').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Valid end time is required (HH:MM)'),
  body('location').optional(),
  body('event_type').isIn(['workshop', 'seminar', 'social', 'mandatory', 'competition', 'networking']).withMessage('Valid event type is required'),
  body('is_mandatory').isBoolean().withMessage('Mandatory flag must be boolean')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    const { title, description, event_date, start_time, end_time, location, event_type, is_mandatory } = req.body;
    
    const result = await pool.query(
      `INSERT INTO calendar_events (title, description, event_date, start_time, end_time, location, event_type, is_mandatory) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
       RETURNING *`,
      [title, description, event_date, start_time, end_time, location, event_type, is_mandatory]
    );

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
  body('start_time').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Valid start time is required (HH:MM)'),
  body('end_time').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Valid end time is required (HH:MM)'),
  body('location').optional(),
  body('event_type').isIn(['workshop', 'seminar', 'social', 'mandatory', 'competition', 'networking']).withMessage('Valid event type is required'),
  body('is_mandatory').isBoolean().withMessage('Mandatory flag must be boolean')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    const eventId = req.params.id;
    const { title, description, event_date, start_time, end_time, location, event_type, is_mandatory } = req.body;
    
    const result = await pool.query(
      `UPDATE calendar_events 
       SET title = $1, description = $2, event_date = $3, start_time = $4, end_time = $5, 
           location = $6, event_type = $7, is_mandatory = $8, updated_at = CURRENT_TIMESTAMP
       WHERE id = $9 
       RETURNING *`,
      [title, description, event_date, start_time, end_time, location, event_type, is_mandatory, eventId]
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
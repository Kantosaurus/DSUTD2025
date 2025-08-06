const express = require('express');
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { logSecurityEvent } = require('../utils/security');

const router = express.Router();

// Sign up for an event
router.post('/:eventId/signup', authenticateToken, async (req, res) => {
  try {
    const eventId = req.params.eventId;
    const userId = req.user.currentUser.id;

    // Check if event exists
    const eventResult = await pool.query(
      'SELECT id, title FROM calendar_events WHERE id = $1',
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

    // Check if user is signed up for the event and get event details
    const signupResult = await pool.query(
      `SELECT es.id, ce.title, ce.event_type 
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
    if (signup.event_type === 'Mandatory') {
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

module.exports = router;
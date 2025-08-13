const express = require('express');
const { pool } = require('../config/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { logSecurityEvent } = require('../utils/security');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');

const router = express.Router();

// Configure Multer for temporary file storage
const upload = multer({ dest: 'uploads/' });

// Get all calendar events (admin only) - removed duplicate, keeping comprehensive version below

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

// Batch upload calendar events from CSV (admin only)
router.post('/calendar/events/batch', authenticateToken, requireAdmin, upload.single('csvFile'), async (req, res) => {
  let processedCount = 0;
  let skippedCount = 0;
  const errors = [];
  
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'CSV file is required' });
    }

    const csvFilePath = req.file.path;
    const events = [];

    // Parse CSV file
    await new Promise((resolve, reject) => {
      fs.createReadStream(csvFilePath)
        .pipe(csv())
        .on('data', (row) => {
          events.push(row);
        })
        .on('end', resolve)
        .on('error', reject);
    });

    // Validate and insert events
    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      
      try {
        // Validate required fields
        if (!event.title || !event.event_date || !event.start_time || !event.end_time || !event.event_type) {
          errors.push(`Row ${i + 1}: Missing required fields`);
          skippedCount++;
          continue;
        }

        // Validate event type
        const validEventTypes = ['Mandatory', 'Optional', 'Pending', 'workshop', 'seminar', 'social', 'mandatory', 'competition', 'networking'];
        if (!validEventTypes.includes(event.event_type)) {
          errors.push(`Row ${i + 1}: Invalid event type '${event.event_type}'`);
          skippedCount++;
          continue;
        }

        // Validate time format
        const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
        if (!timeRegex.test(event.start_time) || !timeRegex.test(event.end_time)) {
          errors.push(`Row ${i + 1}: Invalid time format`);
          skippedCount++;
          continue;
        }

        // Auto-assign color based on event type
        const eventColor = event.color || getEventTypeColor(event.event_type);

        // Insert event
        const insertResult = await pool.query(
          `INSERT INTO calendar_events (title, description, event_date, start_time, end_time, location, event_type, color, max_participants) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
          [
            event.title,
            event.description || null,
            event.event_date,
            event.start_time,
            event.end_time,
            event.location || null,
            event.event_type,
            eventColor,
            event.max_participants ? parseInt(event.max_participants) : null
          ]
        );

        // If this is a mandatory event, automatically sign up all verified users
        if (event.event_type === 'Mandatory' || event.event_type === 'mandatory') {
          try {
            const verifiedUsers = await pool.query(
              'SELECT id FROM users WHERE email_verified = true AND is_active = true'
            );
            
            for (const user of verifiedUsers.rows) {
              await pool.query(
                'INSERT INTO event_signups (user_id, event_id) VALUES ($1, $2) ON CONFLICT (user_id, event_id) DO NOTHING',
                [user.id, insertResult.rows[0].id]
              );
            }
          } catch (autoSignupError) {
            console.error('Error auto-signing up users for mandatory batch event:', autoSignupError);
            // Don't fail batch import if auto-signup fails
          }
        }

        processedCount++;
      } catch (error) {
        errors.push(`Row ${i + 1}: ${error.message}`);
        skippedCount++;
      }
    }

    // Clean up uploaded file
    fs.unlinkSync(csvFilePath);

    await logSecurityEvent('CALENDAR_BATCH_UPLOAD', `Batch upload completed: ${processedCount} events added`, req.user.currentUser.id, {
      processedCount,
      skippedCount,
      totalRows: events.length
    }, req);

    res.json({
      message: 'Batch upload completed',
      processedCount,
      skippedCount,
      totalRows: events.length,
      errors: errors.length > 0 ? errors.slice(0, 10) : [] // Limit errors shown
    });

  } catch (err) {
    console.error('Error in batch upload:', err);
    
    // Clean up uploaded file if it exists
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({ error: 'Internal server error during batch upload' });
  }
});

// Get admin calendar events with additional details
router.get('/calendar/events', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        ce.*,
        COUNT(es.id) as signup_count
      FROM calendar_events ce
      LEFT JOIN event_signups es ON ce.id = es.event_id
      GROUP BY ce.id
      ORDER BY ce.event_date ASC, ce.start_time ASC
    `);
    
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching admin calendar events:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get security events (admin only)
router.get('/security-events', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;

    const result = await pool.query(`
      SELECT se.*, u.student_id, u.email
      FROM security_events se
      LEFT JOIN users u ON se.user_id = u.id
      ORDER BY se.created_at DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);
    
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching security events:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get login attempts (admin only)
router.get('/login-attempts', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;

    const result = await pool.query(`
      SELECT * FROM login_attempts
      ORDER BY attempt_time DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);
    
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching login attempts:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get dashboard statistics (admin only)
router.get('/dashboard-stats', authenticateToken, requireAdmin, async (req, res) => {
  try {
    // Get user counts and roles
    const userCountResult = await pool.query('SELECT COUNT(*) as total FROM users');
    const userRoleResult = await pool.query('SELECT role, COUNT(*) as count FROM users GROUP BY role');
    
    const usersByRole = {};
    userRoleResult.rows.forEach(row => {
      usersByRole[row.role] = parseInt(row.count);
    });

    // Get event counts
    const eventCountResult = await pool.query('SELECT COUNT(*) as total FROM calendar_events WHERE is_active = true');
    const upcomingEventsResult = await pool.query('SELECT COUNT(*) as upcoming FROM calendar_events WHERE event_date >= CURRENT_DATE AND is_active = true');
    const ongoingEventsResult = await pool.query('SELECT COUNT(*) as ongoing FROM calendar_events WHERE event_date = CURRENT_DATE AND is_active = true');
    const pastEventsResult = await pool.query('SELECT COUNT(*) as past FROM calendar_events WHERE event_date < CURRENT_DATE AND is_active = true');

    // Get current and next event
    const currentEventResult = await pool.query(`
      SELECT * FROM calendar_events 
      WHERE event_date = CURRENT_DATE AND is_active = true 
      ORDER BY start_time ASC 
      LIMIT 1
    `);
    
    const nextEventResult = await pool.query(`
      SELECT * FROM calendar_events 
      WHERE event_date > CURRENT_DATE AND is_active = true 
      ORDER BY event_date ASC, start_time ASC 
      LIMIT 1
    `);

    // Get signup statistics
    const signupCountResult = await pool.query('SELECT COUNT(*) as total FROM event_signups');

    // Get recent activity and failed logins
    const recentActivityResult = await pool.query(`
      SELECT COUNT(*) as recent_activity 
      FROM security_events 
      WHERE created_at >= NOW() - INTERVAL '24 hours'
    `);
    
    const failedLoginsResult = await pool.query(`
      SELECT COUNT(*) as failed_logins 
      FROM login_attempts 
      WHERE success = false AND attempt_time >= NOW() - INTERVAL '24 hours'
    `);

    const stats = {
      users: {
        total: parseInt(userCountResult.rows[0].total),
        byRole: usersByRole
      },
      events: {
        total: parseInt(eventCountResult.rows[0].total),
        upcoming: parseInt(upcomingEventsResult.rows[0].upcoming),
        ongoing: parseInt(ongoingEventsResult.rows[0].ongoing),
        past: parseInt(pastEventsResult.rows[0].past)
      },
      currentEvent: currentEventResult.rows[0] || null,
      nextEvent: nextEventResult.rows[0] || null,
      signups: {
        total: parseInt(signupCountResult.rows[0].total)
      },
      activity: {
        recent: parseInt(recentActivityResult.rows[0].recent_activity),
        failedLogins: parseInt(failedLoginsResult.rows[0].failed_logins)
      }
    };

    res.json(stats);
  } catch (err) {
    console.error('Error fetching dashboard stats:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get activity logs (admin only) - combines security events and login attempts
router.get('/activity-logs', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const type = req.query.type || '';

    let query = `
      SELECT 
        id,
        event_type,
        event_description,
        created_at,
        user_id,
        ip_address,
        user_agent,
        metadata
      FROM security_events
    `;
    
    let params = [];
    let paramIndex = 1;

    if (type) {
      query += ` WHERE event_type = $${paramIndex}`;
      params.push(type);
      paramIndex++;
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    // Get user details for each log entry
    const logsWithUserDetails = await Promise.all(
      result.rows.map(async (log) => {
        if (log.user_id) {
          try {
            const userResult = await pool.query(
              'SELECT student_id, email FROM users WHERE id = $1',
              [log.user_id]
            );
            if (userResult.rows.length > 0) {
              log.student_id = userResult.rows[0].student_id;
              log.email = userResult.rows[0].email;
            }
          } catch (err) {
            console.error('Error fetching user details for log:', err);
          }
        }
        return log;
      })
    );

    // Get total count for pagination
    let countQuery = 'SELECT COUNT(*) as total FROM security_events';
    let countParams = [];
    if (type) {
      countQuery += ' WHERE event_type = $1';
      countParams.push(type);
    }

    const countResult = await pool.query(countQuery, countParams);
    const totalRecords = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(totalRecords / limit);

    res.json({
      logs: logsWithUserDetails,
      page,
      totalPages,
      totalRecords
    });
  } catch (err) {
    console.error('Error fetching activity logs:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user registrations (admin only)
router.get('/user-registrations', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const result = await pool.query(`
      SELECT 
        u.id,
        u.student_id,
        u.email,
        u.role,
        u.created_at,
        u.last_login,
        u.is_active,
        COUNT(es.id) as total_signups
      FROM users u
      LEFT JOIN event_signups es ON u.id = es.user_id
      GROUP BY u.id, u.student_id, u.email, u.role, u.created_at, u.last_login, u.is_active
      ORDER BY u.created_at DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);

    // Get total count for pagination
    const countResult = await pool.query('SELECT COUNT(*) as total FROM users');
    const totalRecords = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(totalRecords / limit);

    res.json({
      users: result.rows,
      page,
      totalPages,
      totalRecords
    });
  } catch (err) {
    console.error('Error fetching user registrations:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get event signups (admin only)
router.get('/event-signups', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const result = await pool.query(`
      SELECT 
        es.id,
        es.user_id,
        es.event_id,
        es.signup_date,
        u.student_id,
        u.email,
        ce.title as event_title,
        ce.event_date,
        ce.event_type
      FROM event_signups es
      JOIN users u ON es.user_id = u.id
      JOIN calendar_events ce ON es.event_id = ce.id
      ORDER BY es.signup_date DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);

    // Get total count for pagination
    const countResult = await pool.query('SELECT COUNT(*) as total FROM event_signups');
    const totalRecords = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(totalRecords / limit);

    res.json({
      signups: result.rows,
      page,
      totalPages,
      totalRecords
    });
  } catch (err) {
    console.error('Error fetching event signups:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
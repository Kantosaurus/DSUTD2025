const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database connection
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Color mapping based on event type (matching your frontend expectations)
const getColorForType = (type) => {
  switch (type) {
    case 'holiday':
      return '#EF5800'; // orange
    case 'course':
      return '#F0DD59'; // yellow
    default:
      return '#C60003'; // red for regular
  }
};

// Test database connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Database connection error:', err);
  } else {
    console.log('Database connected successfully');
  }
});

// Routes
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to the WebApp API!' });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Get calendar events for a specific month
app.get('/api/calendar/events', async (req, res) => {
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
        id,
        title,
        description,
        event_date,
        start_time,
        end_time,
        event_type,
        color
       FROM calendar_events 
       WHERE event_date >= $1 AND event_date <= $2 
       ORDER BY event_date, start_time`,
      [startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0]]
    );

    // Group events by date
    const eventsByDate = {};
    result.rows.forEach(event => {
      const dateKey = event.event_date.toISOString().split('T')[0];
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
        const [endHours, endMinutes] = event.end_time.split(':');
        const endHour = parseInt(endHours, 10);
        const endAmpm = endHour >= 12 ? 'PM' : 'AM';
        const endDisplayHour = endHour % 12 || 12;
        endTime = `${endDisplayHour}:${endMinutes} ${endAmpm}`;
      }

      eventsByDate[dateKey].push({
        id: event.id.toString(),
        time: time,
        end_time: endTime,
        title: event.title,
        type: event.event_type, // Will be undefined if null/empty
        color: event.color || getColorForType(event.event_type) || '#94A3B8',
        description: event.description || ''
      });
    });

    res.json(eventsByDate);
  } catch (err) {
    console.error('Error fetching calendar events:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new calendar event
app.post('/api/calendar/events', async (req, res) => {
  try {
    const { title, description, date, start_time, end_time, event_type } = req.body;
    
    if (!title || !date) {
      return res.status(400).json({ error: 'Title and date are required' });
    }

    // Validate event type
    if (event_type && !['regular', 'holiday', 'course'].includes(event_type)) {
      return res.status(400).json({ error: 'Type must be one of: regular, holiday, course' });
    }

    // Automatically set color based on type
    const color = getColorForType(event_type);

    const result = await pool.query(
      `INSERT INTO calendar_events 
       (title, description, event_date, start_time, end_time, event_type, color) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) 
       RETURNING *`,
      [title, description || '', date, start_time || null, end_time || null, event_type || 'regular', color]
    );

    const newEvent = result.rows[0];
    
    // Format times for response
    let formattedTime = '';
    let formattedEndTime = '';
    
    if (newEvent.start_time) {
      const [hours, minutes] = newEvent.start_time.split(':');
      const hour = parseInt(hours, 10);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour % 12 || 12;
      formattedTime = `${displayHour}:${minutes} ${ampm}`;
    }
    
    if (newEvent.end_time) {
      const [endHours, endMinutes] = newEvent.end_time.split(':');
      const endHour = parseInt(endHours, 10);
      const endAmpm = endHour >= 12 ? 'PM' : 'AM';
      const endDisplayHour = endHour % 12 || 12;
      formattedEndTime = `${endDisplayHour}:${endMinutes} ${endAmpm}`;
    }
    
    // Return in frontend-compatible format
    res.status(201).json({
      id: newEvent.id.toString(),
      time: formattedTime,
      end_time: formattedEndTime,
      title: newEvent.title,
      type: newEvent.event_type,
      color: newEvent.color,
      description: newEvent.description
    });
  } catch (err) {
    console.error('Error creating calendar event:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update calendar event
app.put('/api/calendar/events/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, date, start_time, end_time, event_type } = req.body;
    
    // Validate event type
    if (event_type && !['regular', 'holiday', 'course'].includes(event_type)) {
      return res.status(400).json({ error: 'Type must be one of: regular, holiday, course' });
    }

    // Automatically set color based on type
    const color = getColorForType(event_type);

    const result = await pool.query(
      `UPDATE calendar_events 
       SET title = $1, description = $2, event_date = $3, start_time = $4, end_time = $5, event_type = $6, color = $7
       WHERE id = $8
       RETURNING *`,
      [title, description, date, start_time, end_time, event_type, color, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const updatedEvent = result.rows[0];
    
    // Format times for response
    let formattedTime = '';
    let formattedEndTime = '';
    
    if (updatedEvent.start_time) {
      const [hours, minutes] = updatedEvent.start_time.split(':');
      const hour = parseInt(hours, 10);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour % 12 || 12;
      formattedTime = `${displayHour}:${minutes} ${ampm}`;
    }
    
    if (updatedEvent.end_time) {
      const [endHours, endMinutes] = updatedEvent.end_time.split(':');
      const endHour = parseInt(endHours, 10);
      const endAmpm = endHour >= 12 ? 'PM' : 'AM';
      const endDisplayHour = endHour % 12 || 12;
      formattedEndTime = `${endDisplayHour}:${endMinutes} ${endAmpm}`;
    }
    
    // Return in frontend-compatible format
    res.json({
      id: updatedEvent.id.toString(),
      time: formattedTime,
      end_time: formattedEndTime,
      title: updatedEvent.title,
      type: updatedEvent.event_type,
      color: updatedEvent.color,
      description: updatedEvent.description
    });
  } catch (err) {
    console.error('Error updating calendar event:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete calendar event
app.delete('/api/calendar/events/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      'DELETE FROM calendar_events WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    res.status(204).send();
  } catch (err) {
    console.error('Error deleting calendar event:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
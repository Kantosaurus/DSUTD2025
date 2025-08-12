const { pool } = require('./config/database');
const fs = require('fs');

async function populateEvents() {
  try {
    // Read the seed events JSON file
    const seedEvents = JSON.parse(fs.readFileSync('./seed-events.json', 'utf8'));
    
    // Clear existing events (optional)
    await pool.query('DELETE FROM calendar_events WHERE id > 0;');
    console.log('Cleared existing events');
    
    // Get the first admin user to associate events with
    const adminUser = await pool.query('SELECT id FROM users ORDER BY id LIMIT 1');
    const userId = adminUser.rows[0]?.id || 2; // Fallback to ID 2
    
    console.log(`Using user ID: ${userId}`);
    
    // Insert all events
    let insertCount = 0;
    for (const event of seedEvents) {
      try {
        // Auto-assign color based on event type if not provided
        let eventColor = event.color;
        if (!eventColor) {
          switch (event.event_type) {
            case 'Mandatory':
            case 'mandatory':
              eventColor = '#C60003'; // Red
              break;
            case 'Pending':
            case 'pending':
              eventColor = '#F0DD59'; // Yellow
              break;
            default:
              eventColor = '#EF5800'; // Orange for Optional and others
              break;
          }
        }
        
        await pool.query(
          `INSERT INTO calendar_events (title, description, event_date, start_time, end_time, event_type, location, color, max_participants, current_participants, user_id, is_active) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
          [
            event.title,
            event.description,
            event.event_date,
            event.start_time,
            event.end_time,
            event.event_type,
            event.location,
            eventColor,
            event.max_participants || null,
            0, // current_participants
            userId,
            true // is_active
          ]
        );
        insertCount++;
      } catch (err) {
        console.error(`Error inserting event "${event.title}":`, err.message);
      }
    }
    
    console.log(`Successfully inserted ${insertCount} events out of ${seedEvents.length} total`);
    
    // Verify the insertion
    const countResult = await pool.query('SELECT COUNT(*) FROM calendar_events');
    console.log(`Total events in database: ${countResult.rows[0].count}`);
    
  } catch (error) {
    console.error('Error populating events:', error);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

populateEvents();
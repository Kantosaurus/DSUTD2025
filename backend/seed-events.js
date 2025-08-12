const fs = require('fs');
const path = require('path');

// Color mapping function with correct colors
const getColorForType = (type) => {
  switch (type) {
    case 'Mandatory':
      return '#C60003'; // Red
    case 'Optional':
      return '#EF5800'; // Orange  
    case 'Pending':
      return '#F0DD59'; // Yellow
    default:
      return '#EF5800'; // Default to orange for any other types
  }
};

async function seedEvents() {
  // Import pool from database config to avoid creating multiple connections
  const { pool } = require('./config/database');

  try {
    // Read the events JSON file
    const eventsPath = path.join(__dirname, 'seed-events.json');
    const eventsData = JSON.parse(fs.readFileSync(eventsPath, 'utf8'));

    console.log(`Loading ${eventsData.length} events...`);

    // Insert each event
    for (const event of eventsData) {
      const color = getColorForType(event.event_type);
      
      await pool.query(
        `INSERT INTO calendar_events 
         (title, description, event_date, start_time, end_time, event_type, location, color) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT DO NOTHING`,
        [
          event.title,
          event.description || '',
          event.event_date,
          event.start_time || null,
          event.end_time || null,
          event.event_type || 'Mandatory',
          event.location || null,
          color
        ]
      );
    }

    console.log('Events seeded successfully!');
  } catch (error) {
    console.error('Error seeding events:', error);
    throw error; // Re-throw to let caller handle
  }
  // Don't close the pool here since it's shared
}

// Run if called directly
if (require.main === module) {
  seedEvents();
}

module.exports = { seedEvents };
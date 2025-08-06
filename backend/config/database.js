const { Pool } = require('pg');
const path = require('path');

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Critical security check - JWT secret must be provided
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET === 'your-secret-key-change-in-production') {
  console.error('CRITICAL SECURITY ERROR: JWT_SECRET environment variable is not set or is using default value!');
  console.error('Please set a strong, unique JWT_SECRET in your environment variables.');
  process.exit(1);
}

// Validate JWT secret strength
if (JWT_SECRET.length < 32) {
  console.error('CRITICAL SECURITY ERROR: JWT_SECRET is too short. Must be at least 32 characters.');
  process.exit(1);
}

// Initialize database and seed events
async function initializeDatabase() {
  try {
    // Test database connection
    await pool.query('SELECT NOW()');
    console.log('Database connected successfully');
    
    // Check if events need to be seeded
    const eventCount = await pool.query('SELECT COUNT(*) FROM calendar_events');
    if (parseInt(eventCount.rows[0].count) === 0) {
      console.log('No events found, seeding initial events...');
      const { seedEvents } = require(path.join(__dirname, '..', 'seed-events'));
      await seedEvents();
    } else {
      console.log(`Database already contains ${eventCount.rows[0].count} events`);
    }
  } catch (error) {
    console.error('Database initialization error:', error);
    // Don't exit process, let the app continue but log the error
  }
}

// Initialize database on module load
initializeDatabase();

module.exports = { pool, JWT_SECRET };
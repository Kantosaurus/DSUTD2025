const { Pool } = require('pg');

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

module.exports = { pool, JWT_SECRET };
/**
 * Docker initialization script for telegram bot
 * Waits for database and starts the bot
 */

const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'postgres',
  port: process.env.DB_PORT || 5431,
  database: process.env.DB_NAME || 'webapp_db',
  user: process.env.DB_USER || 'webapp_user',
  password: process.env.DB_PASSWORD || 'webapp_password',
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

async function waitForDatabase() {
  console.log('🔍 Waiting for database to be ready...');
  
  let retries = 30; // Wait up to 30 seconds
  while (retries > 0) {
    try {
      await pool.query('SELECT 1');
      console.log('✅ Database is ready');
      return true;
    } catch (error) {
      console.log(`⏳ Database not ready, retrying... (${retries} attempts left)`);
      retries--;
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  throw new Error('Database connection timeout');
}

async function verifyTables() {
  console.log('🔍 Verifying telegram bot tables exist...');
  
  try {
    // Check if telegram_chat_id column exists
    const columnCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'telegram_chat_id'
    `);

    // Check if reminder_notifications table exists
    const tableCheck = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'reminder_notifications'
    `);

    const hasColumn = columnCheck.rows.length > 0;
    const hasTable = tableCheck.rows.length > 0;

    if (!hasColumn || !hasTable) {
      console.error('❌ Required telegram bot tables not found!');
      console.error('   Please ensure the database was initialized with the latest init.sql');
      console.error(`   telegram_chat_id column: ${hasColumn ? 'EXISTS' : 'MISSING'}`);
      console.error(`   reminder_notifications table: ${hasTable ? 'EXISTS' : 'MISSING'}`);
      throw new Error('Missing required database tables for telegram bot');
    }

    console.log('✅ All required telegram bot tables found');
    return true;
  } catch (error) {
    console.error('❌ Table verification failed:', error.message);
    throw error;
  }
}

async function startBot() {
  console.log('🚀 Starting telegram bot...');
  
  // Import and start the main bot
  require('../bot.js');
}

async function initialize() {
  try {
    await waitForDatabase();
    await verifyTables();
    await pool.end();
    
    // Start the bot
    await startBot();
  } catch (error) {
    console.error('❌ Initialization failed:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Received SIGINT, shutting down...');
  await pool.end();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Received SIGTERM, shutting down...');
  await pool.end();
  process.exit(0);
});

// Start initialization
initialize();
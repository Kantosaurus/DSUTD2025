/**
 * Setup script to initialize the database for telegram bot functionality
 * Usage: node scripts/setup.js
 */

require('dotenv').config({ path: '../../.env' });
const fs = require('fs');
const path = require('path');
const { pool } = require('../config/database');

class SetupScript {
  constructor() {
    this.migrationPath = path.join(__dirname, '../migrations/add_telegram_chat_id.sql');
  }

  async checkDatabaseConnection() {
    console.log('🔍 Testing database connection...');
    try {
      const result = await pool.query('SELECT version()');
      console.log('✅ Database connected successfully');
      console.log(`   PostgreSQL version: ${result.rows[0].version.split(' ')[1]}`);
      return true;
    } catch (error) {
      console.error('❌ Database connection failed:', error.message);
      console.error('   Please check your database configuration in .env file');
      return false;
    }
  }

  async checkExistingSchema() {
    console.log('🔍 Checking existing database schema...');
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

      console.log(`   telegram_chat_id column: ${hasColumn ? '✅ Exists' : '❌ Missing'}`);
      console.log(`   reminder_notifications table: ${hasTable ? '✅ Exists' : '❌ Missing'}`);

      return { hasColumn, hasTable };
    } catch (error) {
      console.error('❌ Schema check failed:', error.message);
      return { hasColumn: false, hasTable: false };
    }
  }

  async runMigration() {
    console.log('🔧 Running database migration...');
    
    try {
      // Read migration file
      const migrationSQL = fs.readFileSync(this.migrationPath, 'utf8');
      
      // Split by semicolon and execute each statement
      const statements = migrationSQL
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

      console.log(`   Executing ${statements.length} SQL statements...`);

      for (let i = 0; i < statements.length; i++) {
        try {
          await pool.query(statements[i]);
          console.log(`   ✅ Statement ${i + 1}/${statements.length} executed`);
        } catch (error) {
          // Some statements might fail if they already exist (IF NOT EXISTS), that's OK
          if (error.message.includes('already exists')) {
            console.log(`   ⚠️ Statement ${i + 1}/${statements.length} skipped (already exists)`);
          } else {
            throw error;
          }
        }
      }

      console.log('✅ Migration completed successfully');
      return true;
    } catch (error) {
      console.error('❌ Migration failed:', error.message);
      return false;
    }
  }

  async verifySetup() {
    console.log('🔍 Verifying setup...');
    
    try {
      // Test inserting and selecting from reminder_notifications
      const testQuery = `
        SELECT 
          column_name, 
          data_type, 
          is_nullable
        FROM information_schema.columns 
        WHERE table_name = 'reminder_notifications'
        ORDER BY ordinal_position
      `;
      
      const result = await pool.query(testQuery);
      
      if (result.rows.length === 0) {
        console.error('❌ reminder_notifications table not found');
        return false;
      }

      console.log('✅ reminder_notifications table structure:');
      result.rows.forEach(col => {
        console.log(`   - ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
      });

      // Check indexes
      const indexQuery = `
        SELECT indexname, indexdef 
        FROM pg_indexes 
        WHERE tablename = 'reminder_notifications' OR 
              (tablename = 'users' AND indexname LIKE '%telegram%')
        ORDER BY indexname
      `;
      
      const indexResult = await pool.query(indexQuery);
      console.log(`✅ Found ${indexResult.rows.length} relevant indexes`);
      
      return true;
    } catch (error) {
      console.error('❌ Verification failed:', error.message);
      return false;
    }
  }

  async checkEnvFile() {
    console.log('🔍 Checking environment configuration...');
    
    const requiredVars = [
      'TELEGRAM_BOT_TOKEN',
      'DB_HOST',
      'DB_PORT', 
      'DB_NAME',
      'DB_USER',
      'DB_PASSWORD'
    ];

    const missing = [];
    const present = [];

    requiredVars.forEach(varName => {
      if (process.env[varName]) {
        present.push(varName);
      } else {
        missing.push(varName);
      }
    });

    console.log(`   Present: ${present.length}/${requiredVars.length} variables`);
    
    if (missing.length > 0) {
      console.error('❌ Missing environment variables:');
      missing.forEach(varName => {
        console.error(`   - ${varName}`);
      });
      console.error('   Please check your .env file');
      return false;
    }

    // Check if bot token looks valid
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (botToken && !botToken.includes(':')) {
      console.error('❌ TELEGRAM_BOT_TOKEN appears to be invalid (should contain ":")');
      return false;
    }

    console.log('✅ All required environment variables are set');
    return true;
  }

  async runFullSetup() {
    console.log('🚀 Starting DSUTD Telegram Bot setup...\n');

    // Step 1: Check environment
    const envOK = await this.checkEnvFile();
    if (!envOK) {
      console.log('\n❌ Setup failed: Environment configuration issues');
      return false;
    }
    console.log();

    // Step 2: Check database connection
    const dbOK = await this.checkDatabaseConnection();
    if (!dbOK) {
      console.log('\n❌ Setup failed: Database connection issues');
      return false;
    }
    console.log();

    // Step 3: Check existing schema
    const { hasColumn, hasTable } = await this.checkExistingSchema();
    console.log();

    // Step 4: Run migration if needed
    if (!hasColumn || !hasTable) {
      const migrationOK = await this.runMigration();
      if (!migrationOK) {
        console.log('\n❌ Setup failed: Migration issues');
        return false;
      }
      console.log();
    } else {
      console.log('✅ All required database objects already exist, skipping migration');
      console.log();
    }

    // Step 5: Verify setup
    const verifyOK = await this.verifySetup();
    if (!verifyOK) {
      console.log('\n❌ Setup failed: Verification issues');
      return false;
    }
    console.log();

    // Success!
    console.log('🎉 Setup completed successfully!');
    console.log();
    console.log('Next steps:');
    console.log('1. Install dependencies: npm install');
    console.log('2. Start the bot: npm start');
    console.log('3. Test the bot: node scripts/test-reminder.js');
    console.log();
    console.log('Users can now register with the bot using:');
    console.log('   /start - to begin');
    console.log('   /register [student_id] - to link their account');
    
    return true;
  }
}

// Run the setup
async function main() {
  const setup = new SetupScript();
  const success = await setup.runFullSetup();
  
  // Close database connection
  await pool.end();
  
  process.exit(success ? 0 : 1);
}

// Handle errors
process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled error:', error);
  process.exit(1);
});

main().catch(error => {
  console.error('❌ Setup script error:', error);
  process.exit(1);
});
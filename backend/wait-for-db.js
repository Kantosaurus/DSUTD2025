const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function waitForDatabase() {
  let retries = 30;
  
  while (retries > 0) {
    try {
      await pool.query('SELECT 1');
      console.log('Database is ready!');
      await pool.end();
      return true;
    } catch (error) {
      console.log(`Database not ready yet, retrying... (${retries} attempts left)`);
      retries--;
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  console.error('Database connection failed after 30 attempts');
  process.exit(1);
}

waitForDatabase(); 
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

let db;

try {
  db = require('./config/db');
} catch (error) {
  console.error('Database configuration error:', error.message);
  process.exitCode = 1;
}

async function testDatabaseConnection() {
  if (!db) {
    return;
  }

  try {
    const [rows] = await db.query('SELECT 1 AS connected');
    console.log('Database connection successful.');
    console.log('Query result:', rows[0]);
  } catch (error) {
    console.error('Database connection failed.');
    console.error(error.message);
    process.exitCode = 1;
  }
}

if (require.main === module) {
  testDatabaseConnection();
}

module.exports = { testDatabaseConnection };

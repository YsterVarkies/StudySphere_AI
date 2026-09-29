require('dotenv').config();
const db = require('./config/db');

async function run() {
  try {
    const [rows] = await db.query('SHOW TABLES');
    console.log(rows);
  } catch (e) {
    console.error(e.message);
  } finally {
    process.exit();
  }
}

run();
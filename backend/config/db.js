const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const requiredEnv = [
  'DB_HOST',
  'DB_PORT',
  'DB_NAME',
  'DB_USER',
  'DB_PASSWORD',
  'DB_SSL_CA_PATH',
];

const missingEnv = requiredEnv.filter((key) => {
  const value = process.env[key];
  return value === undefined || value === null || value === '';
});

if (missingEnv.length > 0) {
  throw new Error(
    `Missing required MySQL environment variables: ${missingEnv.join(', ')}`
  );
}

const sslCaPath = path.resolve(process.env.DB_SSL_CA_PATH);

if (!fs.existsSync(sslCaPath)) {
  throw new Error(`MySQL SSL CA certificate not found at: ${sslCaPath}`);
}

const sslCa = fs.readFileSync(sslCaPath);

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: {
    rejectUnauthorized: true,
    ca: sslCa,
  },
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

pool.on('error', (error) => {
  console.error('Unexpected MySQL pool error:', error.message);
});

module.exports = pool;

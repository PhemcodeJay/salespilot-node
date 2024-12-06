const mysql = require('mysql2');

// Create database connection pool
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'dbs13455438',
  charset: 'utf8mb4',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Promisify the pool for async/await support
const db = pool.promise();

module.exports = db;

const mysql = require('mysql2');

// Create a connection pool
const pool = mysql.createPool({
  host: 'localhost',           // Database host
  user: 'root',                // Database user
  password: '',                // Database password
  database: 'dbs13455438',     // Database name
  charset: 'utf8mb4',          // Support for extended UTF-8 characters
  waitForConnections: true,    // Wait if connection pool is busy
  connectionLimit: 10,         // Maximum number of connections in the pool
  queueLimit: 0,               // Unlimited queued requests
});

// Export the pool for query execution
module.exports = {
  pool, // Expose raw pool for advanced use

  // Helper to execute queries with async/await support
  async execute(query, params = []) {
    try {
      const [results] = await pool.promise().execute(query, params);
      return results;
    } catch (err) {
      console.error('Database query error:', err);
      throw err;
    }
  },

  // Helper to use raw connection if needed
  async getConnection() {
    try {
      return await pool.promise().getConnection();
    } catch (err) {
      console.error('Error getting database connection:', err);
      throw err;
    }
  },

  // Close the pool gracefully (optional for cleanup tasks)
  async closePool() {
    try {
      await pool.promise().end();
      console.log('Database pool closed successfully.');
    } catch (err) {
      console.error('Error closing database pool:', err);
      throw err;
    }
  },
};

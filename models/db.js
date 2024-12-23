const mysql = require('mysql2');
require('dotenv').config();

class MySQLPDO {
  constructor() {
    this.connection = mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',         // Database host
      user: process.env.DB_USER || 'root',             // Database user
      password: process.env.DB_PASSWORD || '',         // Database password
      database: process.env.DB_NAME || 'dbs13455438',  // Database name
      charset: 'utf8mb4',                              // Support for extended UTF-8 characters
    });
  }

  // Helper method to execute queries
  async execute(query, params = []) {
    try {
      const [results] = await this.connection.promise().execute(query, params);
      return results;
    } catch (err) {
      console.error('Database query error:', err);
      throw err;
    }
  }

  // Helper method to get a raw connection (for more advanced use cases)
  async getConnection() {
    try {
      return await this.connection.promise().getConnection();
    } catch (err) {
      console.error('Error getting database connection:', err);
      throw err;
    }
  }

  // Close the connection pool gracefully
  async closeConnection() {
    try {
      await this.connection.promise().end();
      console.log('Database connection closed successfully.');
    } catch (err) {
      console.error('Error closing database connection:', err);
      throw err;
    }
  }
}


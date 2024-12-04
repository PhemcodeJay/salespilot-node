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

class PageAccess {
    static async createPageAccessTable() {
      const createTableQuery = `
        CREATE TABLE IF NOT EXISTS page_access (
          id INT(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
          page VARCHAR(255) NOT NULL,
          required_access_level ENUM('trial', 'starter', 'business', 'enterprise') NOT NULL,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
          updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP() ON UPDATE CURRENT_TIMESTAMP()
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;
      `;
      await db.query(createTableQuery);
      console.log('Page Access table created or already exists.');
    }
  
    static async createPageAccessRecord(pageData) {
      const insertQuery = `
        INSERT INTO page_access 
        (page, required_access_level)
        VALUES (?, ?)
      `;
      const { page, required_access_level } = pageData;
  
      try {
        const [result] = await db.query(insertQuery, [page, required_access_level]);
        return { id: result.insertId };
      } catch (error) {
        throw new Error(`Error creating page access record: ${error.message}`);
      }
    }
  
    static async getPageAccessById(id) {
      const query = `SELECT * FROM page_access WHERE id = ?`;
  
      try {
        const [rows] = await db.query(query, [id]);
        if (rows.length === 0) throw new Error('Page access record not found.');
        return rows[0];
      } catch (error) {
        throw new Error(`Error fetching page access: ${error.message}`);
      }
    }
  
    static async getAllPageAccessRecords() {
      const query = `SELECT * FROM page_access ORDER BY created_at DESC`;
  
      try {
        const [rows] = await db.query(query);
        return rows;
      } catch (error) {
        throw new Error(`Error fetching all page access records: ${error.message}`);
      }
    }
  
    static async updatePageAccess(id, updatedData) {
      const { page, required_access_level } = updatedData;
  
      const updateQuery = `
        UPDATE page_access
        SET page = ?, required_access_level = ?
        WHERE id = ?
      `;
      
      try {
        const [result] = await db.query(updateQuery, [page, required_access_level, id]);
        return result.affectedRows > 0;
      } catch (error) {
        throw new Error(`Error updating page access record: ${error.message}`);
      }
    }
  
    static async deletePageAccess(id) {
      const deleteQuery = `DELETE FROM page_access WHERE id = ?`;
  
      try {
        const [result] = await db.query(deleteQuery, [id]);
        return result.affectedRows > 0;
      } catch (error) {
        throw new Error(`Error deleting page access record: ${error.message}`);
      }
    }
  }
  
  module.exports = PageAccess;
  
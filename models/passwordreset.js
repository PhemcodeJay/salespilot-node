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

class PasswordReset {
  static async createPasswordResetsTable() {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS password_resets (
        id INT(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
        user_id INT(11) NOT NULL,
        reset_code VARCHAR(100) NOT NULL,
        expires_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP() ON UPDATE CURRENT_TIMESTAMP(),
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP()
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
    `;
    await db.query(createTableQuery);
    console.log('Password Resets table created or already exists.');
  }

  static async createPasswordResetRecord(resetData) {
    const insertQuery = `
      INSERT INTO password_resets 
      (user_id, reset_code)
      VALUES (?, ?)
    `;
    const { user_id, reset_code } = resetData;

    try {
      const [result] = await db.query(insertQuery, [user_id, reset_code]);
      return { id: result.insertId };
    } catch (error) {
      throw new Error(`Error creating password reset record: ${error.message}`);
    }
  }

  static async getPasswordResetById(id) {
    const query = `SELECT * FROM password_resets WHERE id = ?`;

    try {
      const [rows] = await db.query(query, [id]);
      if (rows.length === 0) throw new Error('Password reset record not found.');
      return rows[0];
    } catch (error) {
      throw new Error(`Error fetching password reset: ${error.message}`);
    }
  }

  static async getPasswordResetByUserId(user_id) {
    const query = `SELECT * FROM password_resets WHERE user_id = ? ORDER BY created_at DESC LIMIT 1`;

    try {
      const [rows] = await db.query(query, [user_id]);
      if (rows.length === 0) throw new Error('Password reset record not found.');
      return rows[0];
    } catch (error) {
      throw new Error(`Error fetching password reset for user: ${error.message}`);
    }
  }

  static async updatePasswordReset(id, updatedData) {
    const { reset_code, expires_at } = updatedData;

    const updateQuery = `
      UPDATE password_resets
      SET reset_code = ?, expires_at = ?
      WHERE id = ?
    `;

    try {
      const [result] = await db.query(updateQuery, [reset_code, expires_at, id]);
      return result.affectedRows > 0;
    } catch (error) {
      throw new Error(`Error updating password reset record: ${error.message}`);
    }
  }

  static async deletePasswordReset(id) {
    const deleteQuery = `DELETE FROM password_resets WHERE id = ?`;

    try {
      const [result] = await db.query(deleteQuery, [id]);
      return result.affectedRows > 0;
    } catch (error) {
      throw new Error(`Error deleting password reset record: ${error.message}`);
    }
  }
}

module.exports = PasswordReset;

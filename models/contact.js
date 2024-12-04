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

class Contact {
  static async createContactsTable() {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS contacts (
        id INT(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP() ON UPDATE CURRENT_TIMESTAMP(),
        phone VARCHAR(50) NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
    `;
    await db.query(createTableQuery);
    console.log('Contacts table created or already exists.');
  }

  static async createContactRecord(contactData) {
    const insertQuery = `
      INSERT INTO contacts 
      (name, email, message, phone)
      VALUES (?, ?, ?, ?)
    `;
    const { name, email, message, phone } = contactData;

    try {
      const [result] = await db.query(insertQuery, [name, email, message, phone]);
      return { id: result.insertId };
    } catch (error) {
      throw new Error(`Error creating contact record: ${error.message}`);
    }
  }

  static async getContactById(id) {
    const query = `SELECT * FROM contacts WHERE id = ?`;

    try {
      const [rows] = await db.query(query, [id]);
      if (rows.length === 0) throw new Error('Contact record not found.');
      return rows[0];
    } catch (error) {
      throw new Error(`Error fetching contact: ${error.message}`);
    }
  }

  static async getAllContacts() {
    const query = `SELECT * FROM contacts ORDER BY created_at DESC`;

    try {
      const [rows] = await db.query(query);
      return rows;
    } catch (error) {
      throw new Error(`Error fetching all contacts: ${error.message}`);
    }
  }

  static async updateContact(id, updatedData) {
    const { name, email, message, phone } = updatedData;

    const updateQuery = `
      UPDATE contacts
      SET name = ?, email = ?, message = ?, phone = ?
      WHERE id = ?
    `;

    try {
      const [result] = await db.query(updateQuery, [name, email, message, phone, id]);
      return result.affectedRows > 0;
    } catch (error) {
      throw new Error(`Error updating contact record: ${error.message}`);
    }
  }

  static async deleteContact(id) {
    const deleteQuery = `DELETE FROM contacts WHERE id = ?`;

    try {
      const [result] = await db.query(deleteQuery, [id]);
      return result.affectedRows > 0;
    } catch (error) {
      throw new Error(`Error deleting contact record: ${error.message}`);
    }
  }
}

module.exports = Contact;

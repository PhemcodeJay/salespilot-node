const db = require('./db');

class User {
  // Method to create a new user
  static async create(user) {
    const { username, email, password, phone, role } = user;
    const query = `
      INSERT INTO users (username, email, password, phone, role)
      VALUES (?, ?, ?, ?, ?)
    `;
    
    try {
      const [result] = await db.query(query, [username, email, password, phone, role]);
      return { id: result.insertId };
    } catch (error) {
      throw new Error(`Error creating user: ${error.message}`);
    }
  }

  // Method to fetch a user by their email address
  static async getByEmail(email) {
    const query = 'SELECT * FROM users WHERE email = ?';
    
    try {
      const [rows] = await db.query(query, [email]);
      return rows.length ? rows[0] : null;
    } catch (error) {
      throw new Error(`Error fetching user by email: ${error.message}`);
    }
  }

  // Method to fetch a user by their ID
  static async getById(id) {
    const query = 'SELECT * FROM users WHERE id = ?';

    try {
      const [rows] = await db.query(query, [id]);
      return rows.length ? rows[0] : null;
    } catch (error) {
      throw new Error(`Error fetching user by ID: ${error.message}`);
    }
  }

  // Method to update user information
  static async update(id, userData) {
    const { username, email, password, phone, role } = userData;
    const query = `
      UPDATE users
      SET username = ?, email = ?, password = ?, phone = ?, role = ?
      WHERE id = ?
    `;

    try {
      const [result] = await db.query(query, [username, email, password, phone, role, id]);
      return result.affectedRows > 0;
    } catch (error) {
      throw new Error(`Error updating user: ${error.message}`);
    }
  }

  // Method to delete a user by their ID
  static async delete(id) {
    const query = 'DELETE FROM users WHERE id = ?';

    try {
      const [result] = await db.query(query, [id]);
      return result.affectedRows > 0;
    } catch (error) {
      throw new Error(`Error deleting user: ${error.message}`);
    }
  }
}

module.exports = User;

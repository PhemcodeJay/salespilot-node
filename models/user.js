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
const User = require('./user'); // Adjust the path to your User model

class UserController {
  // Create a new user
  static async create(req, res) {
    const { username, email, password, phone, role } = req.body;

    if (!username || !email || !password || !phone || !role) {
      return res.status(400).json({ error: 'All fields are required: username, email, password, phone, role' });
    }

    try {
      const result = await User.create({ username, email, password, phone, role });
      res.status(201).json({ message: 'User created successfully.', data: result });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  // Get a user by email
  static async getByEmail(req, res) {
    const { email } = req.params;

    try {
      const user = await User.getByEmail(email);
      if (!user) {
        return res.status(404).json({ error: 'User not found.' });
      }
      res.status(200).json({ data: user });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  // Get a user by ID
  static async getById(req, res) {
    const { id } = req.params;

    try {
      const user = await User.getById(id);
      if (!user) {
        return res.status(404).json({ error: 'User not found.' });
      }
      res.status(200).json({ data: user });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  // Update a user
  static async update(req, res) {
    const { id } = req.params;
    const { username, email, password, phone, role } = req.body;

    if (!username || !email || !password || !phone || !role) {
      return res.status(400).json({ error: 'All fields are required: username, email, password, phone, role' });
    }

    try {
      const success = await User.update(id, { username, email, password, phone, role });
      if (!success) {
        return res.status(404).json({ error: 'User not found or not updated.' });
      }
      res.status(200).json({ message: 'User updated successfully.' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  // Delete a user
  static async delete(req, res) {
    const { id } = req.params;

    try {
      const success = await User.delete(id);
      if (!success) {
        return res.status(404).json({ error: 'User not found or not deleted.' });
      }
      res.status(200).json({ message: 'User deleted successfully.' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = UserController;

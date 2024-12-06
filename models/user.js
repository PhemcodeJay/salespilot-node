const db = require('./db');

class User {
  static async create(user) {
    const { username, email, password, phone, role } = user;
    const [result] = await db.query(
      'INSERT INTO users (username, email, password, phone, role) VALUES (?, ?, ?, ?, ?)',
      [username, email, password, phone, role]
    );
    return { id: result.insertId };
  }

  static async getByEmail(email) {
    const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    return rows.length ? rows[0] : null;
  }
}

module.exports = User;

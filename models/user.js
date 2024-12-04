const mysql = require('mysql2');

// Create database connection pool for better performance
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'your_database_name',
  charset: 'utf8mb4',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Promisify the pool for async/await support
const db = pool.promise();

// PasswordResets Model
class PasswordResets {
    static async createTable() {
      const createTableQuery = `
        CREATE TABLE IF NOT EXISTS password_resets (
          id INT(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
          user_id INT(11) NOT NULL,
          reset_code VARCHAR(100) NOT NULL,
          expires_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
      `;
  
      try {
        await db.query(createTableQuery);
        console.log('password_resets table has been created or already exists.');
      } catch (error) {
        console.error('Error creating password_resets table:', error.message);
      }
    }
  
    static async createReset(userId, resetCode, expiresAt) {
      const insertQuery = `
        INSERT INTO password_resets (user_id, reset_code, expires_at)
        VALUES (?, ?, ?)
      `;
  
      try {
        const [result] = await db.query(insertQuery, [userId, resetCode, expiresAt]);
        return { id: result.insertId };
      } catch (error) {
        throw new Error(`Error creating reset record: ${error.message}`);
      }
    }
  
    static async getResetByCode(resetCode) {
      const selectQuery = `
        SELECT * FROM password_resets WHERE reset_code = ?
      `;
  
      try {
        const [rows] = await db.query(selectQuery, [resetCode]);
        if (rows.length === 0) throw new Error('Reset code not found');
        return rows[0];
      } catch (error) {
        throw new Error(`Error fetching reset record: ${error.message}`);
      }
    }
  
    static async deleteResetById(id) {
      const deleteQuery = `
        DELETE FROM password_resets WHERE id = ?
      `;
  
      try {
        const [result] = await db.query(deleteQuery, [id]);
        return result.affectedRows > 0;
      } catch (error) {
        throw new Error(`Error deleting reset record: ${error.message}`);
      }
    }
  }

// User Model
class User {
  static async getAll() {
    const [rows] = await db.query('SELECT * FROM users');
    return rows;
  }

  static async getById(userId) {
    const [rows] = await db.query('SELECT * FROM users WHERE id = ?', [userId]);
    if (rows.length === 0) throw new Error('User not found');
    return rows[0];
  }

  static async create(user) {
    const {
      username,
      email,
      password,
      confirmpassword,
      user_image,
      phone,
      location,
      google_id,
      status,
      role,
    } = user;

    const [result] = await db.query(
      'INSERT INTO users (username, email, password, confirmpassword, user_image, phone, location, google_id, status, role) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [username, email, password, confirmpassword, user_image, phone, location, google_id, status, role]
    );

    return { id: result.insertId };
  }

  static async update(userId, userData) {
    const {
      username,
      email,
      password,
      confirmpassword,
      user_image,
      phone,
      location,
      google_id,
      status,
      role,
    } = userData;

    const [result] = await db.query(
      'UPDATE users SET username = ?, email = ?, password = ?, confirmpassword = ?, user_image = ?, phone = ?, location = ?, google_id = ?, status = ?, role = ? WHERE id = ?',
      [username, email, password, confirmpassword, user_image, phone, location, google_id, status, role, userId]
    );

    return result;
  }

  static async delete(userId) {
    const [result] = await db.query('DELETE FROM users WHERE id = ?', [userId]);
    return result;
  }
}


// ActivationCode Model
class ActivationCode {
  static async getByUserId(userId) {
    const [rows] = await db.query('SELECT * FROM activation_codes WHERE user_id = ?', [userId]);
    if (rows.length === 0) throw new Error('Activation code not found');
    return rows[0];
  }

  static async create(userId, activationCode, expiresAt) {
    const [result] = await db.query(
      'INSERT INTO activation_codes (user_id, activation_code, expires_at) VALUES (?, ?, ?)',
      [userId, activationCode, expiresAt]
    );

    return { id: result.insertId };
  }

  static async update(id, activationCode, expiresAt) {
    const [result] = await db.query(
      'UPDATE activation_codes SET activation_code = ?, expires_at = ? WHERE id = ?',
      [activationCode, expiresAt, id]
    );

    return result;
  }

  static async delete(id) {
    const [result] = await db.query('DELETE FROM activation_codes WHERE id = ?', [id]);
    return result;
  }
}

// Contact Model
class Contact {
  static async getAll() {
    const [rows] = await db.query('SELECT * FROM contacts');
    return rows;
  }

  static async getById(contactId) {
    const [rows] = await db.query('SELECT * FROM contacts WHERE id = ?', [contactId]);
    if (rows.length === 0) throw new Error('Contact not found');
    return rows[0];
  }

  static async create(contact) {
    const { name, email, message, phone } = contact;

    const [result] = await db.query(
      'INSERT INTO contacts (name, email, message, phone) VALUES (?, ?, ?, ?)',
      [name, email, message, phone]
    );

    return { id: result.insertId };
  }

  static async update(contactId, contactData) {
    const { name, email, message, phone } = contactData;

    const [result] = await db.query(
      'UPDATE contacts SET name = ?, email = ?, message = ?, phone = ? WHERE id = ?',
      [name, email, message, phone, contactId]
    );

    return result;
  }

  static async delete(contactId) {
    const [result] = await db.query('DELETE FROM contacts WHERE id = ?', [contactId]);
    return result;
  }
}

// Subscription Model
class Subscription {
  static async getByUserId(userId) {
    const [rows] = await db.query('SELECT * FROM subscriptions WHERE user_id = ?', [userId]);
    if (rows.length === 0) throw new Error('Subscription not found');
    return rows[0];
  }

  static async create(userId, subscriptionPlan, startDate, endDate, status, isFreeTrialUsed) {
    const [result] = await db.query(
      'INSERT INTO subscriptions (user_id, subscription_plan, start_date, end_date, status, is_free_trial_used) VALUES (?, ?, ?, ?, ?, ?)',
      [userId, subscriptionPlan, startDate, endDate, status, isFreeTrialUsed]
    );

    return { id: result.insertId };
  }

  static async update(id, subscriptionData) {
    const { subscriptionPlan, startDate, endDate, status, isFreeTrialUsed } = subscriptionData;

    const [result] = await db.query(
      'UPDATE subscriptions SET subscription_plan = ?, start_date = ?, end_date = ?, status = ?, is_free_trial_used = ? WHERE id = ?',
      [subscriptionPlan, startDate, endDate, status, isFreeTrialUsed, id]
    );

    return result;
  }

  static async delete(id) {
    const [result] = await db.query('DELETE FROM subscriptions WHERE id = ?', [id]);
    return result;
  }
}

// Payment Model
class Payment {
  static async getAll() {
    const [rows] = await db.query('SELECT * FROM payments');
    return rows;
  }

  static async getByUserId(userId) {
    const [rows] = await db.query('SELECT * FROM payments WHERE user_id = ?', [userId]);
    return rows;
  }

  static async create(userId, paymentMethod, paymentProof, paymentAmount, paymentStatus, subscriptionId) {
    const [result] = await db.query(
      'INSERT INTO payments (user_id, payment_method, payment_proof, payment_amount, payment_status, subscription_id) VALUES (?, ?, ?, ?, ?, ?)',
      [userId, paymentMethod, paymentProof, paymentAmount, paymentStatus, subscriptionId]
    );

    return { id: result.insertId };
  }

  static async update(id, paymentData) {
    const { paymentMethod, paymentProof, paymentAmount, paymentStatus, subscriptionId } = paymentData;

    const [result] = await db.query(
      'UPDATE payments SET payment_method = ?, payment_proof = ?, payment_amount = ?, payment_status = ?, subscription_id = ? WHERE id = ?',
      [paymentMethod, paymentProof, paymentAmount, paymentStatus, subscriptionId, id]
    );

    return result;
  }

  static async delete(id) {
    const [result] = await db.query('DELETE FROM payments WHERE id = ?', [id]);
    return result;
  }
}

// Export all models
module.exports = { User, ActivationCode, Contact, Subscription, Payment };

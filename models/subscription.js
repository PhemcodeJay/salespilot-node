const mysql = require('mysql2');

// Create database connection pool
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'dbs13455438',
  charset: 'utf8',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Promisify the pool for async/await support
const db = pool.promise();

class Subscription {
  static async createSubscriptionsTable() {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS subscriptions (
        id INT(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
        user_id INT(11) NOT NULL,
        subscription_plan ENUM('starter', 'business', 'enterprise') NOT NULL,
        start_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
        end_date TIMESTAMP NOT NULL DEFAULT '2030-12-31 20:59:59',
        status ENUM('active', 'expired', 'canceled') DEFAULT 'active',
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP() ON UPDATE CURRENT_TIMESTAMP(),
        is_free_trial_used TINYINT(1) DEFAULT 0
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;
    `;
    await db.query(createTableQuery);
    console.log('Subscriptions table created or already exists.');
  }

  static async createSubscription(subscriptionData) {
    const insertQuery = `
      INSERT INTO subscriptions 
      (user_id, subscription_plan, start_date, end_date, status, is_free_trial_used)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    const { user_id, subscription_plan, start_date, end_date, status, is_free_trial_used } = subscriptionData;

    try {
      const [result] = await db.query(insertQuery, [user_id, subscription_plan, start_date, end_date, status, is_free_trial_used]);
      return { id: result.insertId };
    } catch (error) {
      throw new Error(`Error creating subscription: ${error.message}`);
    }
  }

  static async getSubscriptionById(id) {
    const query = `SELECT * FROM subscriptions WHERE id = ?`;

    try {
      const [rows] = await db.query(query, [id]);
      if (rows.length === 0) throw new Error('Subscription not found.');
      return rows[0];
    } catch (error) {
      throw new Error(`Error fetching subscription: ${error.message}`);
    }
  }

  static async getActiveSubscriptionByUserId(user_id) {
    const query = `SELECT * FROM subscriptions WHERE user_id = ? AND status = 'active'`;

    try {
      const [rows] = await db.query(query, [user_id]);
      if (rows.length === 0) throw new Error('Active subscription not found for this user.');
      return rows[0];
    } catch (error) {
      throw new Error(`Error fetching active subscription for user: ${error.message}`);
    }
  }

  static async updateSubscriptionStatus(id, status) {
    const updateQuery = `
      UPDATE subscriptions
      SET status = ?
      WHERE id = ?
    `;

    try {
      const [result] = await db.query(updateQuery, [status, id]);
      return result.affectedRows > 0;
    } catch (error) {
      throw new Error(`Error updating subscription status: ${error.message}`);
    }
  }

  static async cancelSubscription(id) {
    const cancelQuery = `
      UPDATE subscriptions
      SET status = 'canceled'
      WHERE id = ?
    `;

    try {
      const [result] = await db.query(cancelQuery, [id]);
      return result.affectedRows > 0;
    } catch (error) {
      throw new Error(`Error canceling subscription: ${error.message}`);
    }
  }

  static async deleteSubscription(id) {
    const deleteQuery = `DELETE FROM subscriptions WHERE id = ?`;

    try {
      const [result] = await db.query(deleteQuery, [id]);
      return result.affectedRows > 0;
    } catch (error) {
      throw new Error(`Error deleting subscription: ${error.message}`);
    }
  }
}

module.exports = Subscription;

const db = require('./db');

class Subscription {
  static async createFreeTrial(userId) {
    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(startDate.getMonth() + 3); // Add 3 months

    const [result] = await db.query(
      'INSERT INTO subscriptions (user_id, subscription_plan, start_date, end_date, status, is_free_trial_used) VALUES (?, ?, ?, ?, ?, ?)',
      [userId, 'Free Trial', startDate, endDate, 'Active', true]
    );
    return { id: result.insertId };
  }
}

module.exports = Subscription;
const db = require('./db');

class Subscription {
  // Method to create a free trial subscription
  static async createFreeTrial(userId) {
    const startDate = new Date(); // Current date
    const endDate = new Date();
    endDate.setMonth(startDate.getMonth() + 3); // Add 3 months to the start date

    // Query to insert a new subscription record
    const [result] = await db.query(
      'INSERT INTO subscriptions (user_id, subscription_plan, start_date, end_date, status, is_free_trial_used) VALUES (?, ?, ?, ?, ?, ?)',
      [userId, 'Free Trial', startDate, endDate, 'Active', true]
    );

    // Return the created subscription's ID
    return { id: result.insertId };
  }

  // Optionally, you can add methods for other subscription actions (e.g., upgrading, cancelling)
}

module.exports = Subscription;

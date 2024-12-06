const db = require('./db'); // Assuming this is your database connection module

class Subscription {
  // Method to create a free trial subscription
  static async createFreeTrial(userId) {
    const startDate = new Date(); // Current date
    const endDate = new Date();
    endDate.setMonth(startDate.getMonth() + 3); // Add 3 months to the start date

    const query = `
      INSERT INTO subscriptions (user_id, subscription_plan, start_date, end_date, status, is_free_trial_used)
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    try {
      const [result] = await db.query(query, [
        userId,
        'Free Trial',
        startDate,
        endDate,
        'Active',
        true,
      ]);
      return { id: result.insertId };
    } catch (error) {
      throw new Error(`Error creating free trial subscription: ${error.message}`);
    }
  }

  // Method to fetch an active subscription
  static async getActiveSubscription(userId) {
    const query = 'SELECT * FROM subscriptions WHERE user_id = ? AND status = "Active"';

    try {
      const [rows] = await db.query(query, [userId]);
      return rows.length > 0 ? rows[0] : null; // Return the subscription if active
    } catch (error) {
      throw new Error(`Error fetching active subscription for user ${userId}: ${error.message}`);
    }
  }

  // Method to update a subscription (e.g., after payment)
  static async updateSubscription(userId, data) {
    const { status, end_date } = data;
    const query = `
      UPDATE subscriptions
      SET status = ?, end_date = ?
      WHERE user_id = ?
    `;

    try {
      const [result] = await db.query(query, [status, end_date, userId]);
      return result.affectedRows > 0; // Return true if the update was successful
    } catch (error) {
      throw new Error(`Error updating subscription for user ${userId}: ${error.message}`);
    }
  }

  // Method to upgrade the subscription plan for a user
  static async upgradeSubscription(userId, newPlan) {
    const query = `
      UPDATE subscriptions
      SET subscription_plan = ?, status = 'Active', is_free_trial_used = false
      WHERE user_id = ? AND status = 'Active'
    `;

    try {
      const [result] = await db.query(query, [newPlan, userId]);
      return result.affectedRows > 0; // Return true if the upgrade was successful
    } catch (error) {
      throw new Error(`Error upgrading subscription for user ${userId}: ${error.message}`);
    }
  }

  // Method to cancel a subscription
  static async cancelSubscription(userId) {
    const query = `
      UPDATE subscriptions
      SET status = 'Cancelled'
      WHERE user_id = ? AND status = 'Active'
    `;

    try {
      const [result] = await db.query(query, [userId]);
      return result.affectedRows > 0; // Return true if the cancellation was successful
    } catch (error) {
      throw new Error(`Error cancelling subscription for user ${userId}: ${error.message}`);
    }
  }

  // Method to get the current subscription status of a user
  static async getSubscriptionStatus(userId) {
    const query = `SELECT * FROM subscriptions WHERE user_id = ? AND status = 'Active'`;

    try {
      const [rows] = await db.query(query, [userId]);
      if (rows.length === 0) return null; // No active subscription found
      return rows[0];
    } catch (error) {
      throw new Error(`Error fetching subscription status for user ${userId}: ${error.message}`);
    }
  }
}

module.exports = Subscription;
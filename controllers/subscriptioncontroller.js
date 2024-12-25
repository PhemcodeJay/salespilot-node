const mysql = require('mysql2/promise');
const { DateTime } = require('luxon');
const userModel = require('../models/authModel');

// Create a database pool for better performance with multiple queries
const db = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'dbs13455438',
});

/**
 * Checks and deactivates expired subscriptions in the database.
 */
const checkAndDeactivateSubscriptions = async () => {
  try {
    // Fetch all active subscriptions with expiration dates
    const [subscriptions] = await db.execute(
      'SELECT id, user_id, expiration_date FROM subscriptions WHERE status = "active"'
    );

    // Current date for comparison
    const now = DateTime.now();

    for (const subscription of subscriptions) {
      const expirationDate = DateTime.fromISO(subscription.expiration_date);

      if (expirationDate < now) {
        // Update the subscription status to "inactive"
        await db.execute(
          'UPDATE subscriptions SET status = "inactive" WHERE id = ?',
          [subscription.id]
        );
        console.log(`Subscription ID ${subscription.id} deactivated for User ID ${subscription.user_id}`);
      }
    }
  } catch (error) {
    console.error('Error during subscription check and deactivation:', error.message);
    throw error;
  }
};

module.exports = { checkAndDeactivateSubscriptions };

const mysql = require('mysql2');
const { DateTime } = require('luxon');

// MySQL connection setup (adjust credentials if needed)
const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'dbs13455438'
});

// Function to check and deactivate expired subscriptions
const checkAndDeactivateSubscriptions = async () => {
  try {
    // Step 1: Fetch all active subscriptions
    const [results] = await connection.promise().execute(
      'SELECT id, user_id, subscription_plan, end_date FROM subscriptions WHERE status = "active"'
    );

    // Step 2: Get the current date
    const current_date = DateTime.local();

    for (const subscription of results) {
      const trial_end_date = DateTime.fromSQL(subscription.end_date);

      // Step 3: Check if the trial period has ended or if the subscription has expired
      if (subscription.subscription_plan === 'trial' && current_date > trial_end_date) {
        // Trial expired, deactivate subscription
        await deactivateSubscription(subscription.id);
      } else if (subscription.subscription_plan !== 'trial' && current_date > trial_end_date) {
        // Paid subscription expired, deactivate subscription
        await deactivateSubscription(subscription.id);
      }
    }
  } catch (error) {
    console.error('Error in subscription check:', error);
  }
};

// Function to deactivate subscription
const deactivateSubscription = async (subscription_id) => {
  try {
    await connection.promise().execute(
      'UPDATE subscriptions SET status = "inactive" WHERE id = ?',
      [subscription_id]
    );
    console.log(`Subscription ${subscription_id} has been deactivated.`);
  } catch (err) {
    console.error('Error deactivating subscription:', err);
  }
};

// Export the function
module.exports = {
  checkAndDeactivateSubscriptions
};

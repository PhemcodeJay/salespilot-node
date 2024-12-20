const cron = require('node-cron');
const { checkAndDeactivateSubscriptions } = require('../controllers/subscriptioncontroller');

// Schedule the cron job to run every day at midnight
cron.schedule('0 0 * * *', async () => {
  console.log('Running cron job to check and deactivate expired subscriptions...');
  try {
    await checkAndDeactivateSubscriptions(); // Call the function to check and deactivate expired subscriptions
    console.log('Expired subscriptions have been deactivated successfully.');
  } catch (error) {
    console.error('Error while checking and deactivating subscriptions:', error.message);
  }
});

// Optional: You can also manually trigger the function to check immediately for testing
(async () => {
  try {
    await checkAndDeactivateSubscriptions(); // This is for immediate execution when the server starts
    console.log('Initial subscription check completed.');
  } catch (error) {
    console.error('Error during initial subscription check:', error.message);
  }
})();


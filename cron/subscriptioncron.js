const cron = require('node-cron');
const { checkAndDeactivateSubscriptions } = require('../controllers/subscriptioncontroller');

// Schedule the cron job to run every day at midnight
cron.schedule('0 0 * * *', () => {
  console.log('Running cron job to check and deactivate expired subscriptions...');
  checkAndDeactivateSubscriptions(); // Call the function to check and deactivate expired subscriptions
});

// Optional: You can also manually trigger the function to check immediately for testing
checkAndDeactivateSubscriptions(); // This is for immediate execution when the server starts

// Import the cron job for subscriptions
// require('./cron/subscriptionCron');
const express = require('express');
const mysql = require('mysql2');
const path = require('path');
const { DateTime } = require('luxon'); // For date comparison
const profileController = require('../controllers/profilecontroller');
const authController = require('../controllers/authcontroller');
const subscriptionController = require('../controllers/subscriptioncontroller');
const router = express.Router();
const pool = require('../models/db'); // Import the database connection
const session = require('express-session');
const { checkLogin } = require('../middleware/auth'); // Import middleware


// Import the cron job for subscriptions
// require('./cron/subscriptionCron');

// MySQL connection setup (adjust credentials if needed)
const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'dbs13455438'
});


// Route to handle premium content access control
router.get('/premium-content', (req, res) => {
  if (!req.session.username) {
    return res.send('No username found in session. Please log in.');
  }

  const username = req.session.username;

  try {
    // Step 1: Fetch the user's ID based on the username
    connection.execute('SELECT id FROM users WHERE username = ? LIMIT 1', [username], (err, results) => {
      if (err) throw err;

      if (results.length === 0) {
        return res.send('User not found in the database.');
      }

      const user_id = results[0].id;

      // Step 2: Fetch the user's subscription plan and trial end date
      connection.execute('SELECT subscription_plan, start_date, end_date FROM subscriptions WHERE user_id = ? AND status = "active" LIMIT 1', [user_id], (err, results) => {
        if (err) throw err;

        if (results.length === 0) {
          return res.redirect('/dashboard'); // Redirect if no active subscription
        }

        const user_subscription = results[0];
        const current_date = DateTime.local();
        const trial_end_date = DateTime.fromSQL(user_subscription.end_date);

        // Step 3: Check if the user is in their trial period
        if (user_subscription.subscription_plan === 'trial' && current_date <= trial_end_date) {
          user_subscription.subscription_plan = 'enterprise'; // Grant enterprise access during the trial period
        }

        // Step 4: Get the required access level for the current page
        const page_name = path.basename(req.originalUrl);
        connection.execute('SELECT required_access_level FROM page_access WHERE page = ?', [page_name], (err, results) => {
          if (err) throw err;

          const required_access_level = results.length > 0 ? results[0].required_access_level : null;

          if (!required_access_level) {
            return res.redirect('/dashboard'); // Redirect if page access level is not defined
          }

          // Step 5: Define subscription levels for comparison
          const access_levels = {
            'trial': 4,
            'starter': 1,
            'business': 2,
            'enterprise': 3
          };

          // Step 6: Check if user's subscription level meets or exceeds the required access level
          if (access_levels[user_subscription.subscription_plan] < access_levels[required_access_level]) {
            return res.redirect('/dashboard'); // Redirect if access is not allowed
          }

          // If the user has the required access, render the content
          let contentFile = '';
          switch (user_subscription.subscription_plan) {
            case 'starter':
              contentFile = 'starter_content.html';
              break;
            case 'business':
              contentFile = 'business_content.html';
              break;
            case 'enterprise':
              contentFile = 'enterprise_content.html';
              break;
            default:
              contentFile = 'no_content.html';
              break;
          }

          res.sendFile(path.join(__dirname, 'views', contentFile));
        });
      });
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('An error occurred.');
  }
});

module.exports = router;

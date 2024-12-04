crequire('dotenv').config(); // Load environment variables from .env file

const express = require('express');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const mysql = require('mysql2');

// Create Express app
const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// MySQL connection setup
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
});
// Subscription access levels
const accessLevels = {
  'trial': 4,
  'starter': 1,
  'business': 2,
  'enterprise': 3,
};

module.exports = {
  checkAccess: (req, res) => {
    if (!req.session.username) {
      return res.status(403).send("No username found in session. Please log in.");
    }

    const username = req.session.username;

    // Step 1: Fetch user ID based on the username
    const queryUserId = `SELECT id FROM users WHERE username = ? LIMIT 1`;
    db.execute(queryUserId, [username], (err, results) => {
      if (err) return res.status(500).send("Database error: " + err.message);

      if (results.length === 0) {
        return res.status(404).send("User not found.");
      }

      const userId = results[0].id;

      // Step 2: Fetch the user's active subscription
      const querySubscription = `SELECT subscription_plan, start_date, end_date 
                                 FROM subscriptions WHERE user_id = ? AND status = 'active' LIMIT 1`;

      db.execute(querySubscription, [userId], (err, results) => {
        if (err) return res.status(500).send("Database error: " + err.message);

        if (results.length === 0) {
          return res.redirect('/dashboard');
        }

        const userSubscription = results[0];

        // Step 3: Check if the user is in their trial period
        const currentDate = moment();
        const trialEndDate = moment(userSubscription.end_date);

        if (userSubscription.subscription_plan === 'trial' && currentDate.isBefore(trialEndDate)) {
          userSubscription.subscription_plan = 'enterprise'; // Grant enterprise access during the trial period
        }

        // Step 4: Get the required access level for the current page
        const pageName = req.path;  // Get the page name from the route (assume it's part of URL)

        const queryPageAccess = `SELECT required_access_level FROM page_access WHERE page = ?`;
        db.execute(queryPageAccess, [pageName], (err, results) => {
          if (err) return res.status(500).send("Database error: " + err.message);

          if (results.length === 0) {
            return res.redirect('/dashboard');
          }

          const requiredAccessLevel = results[0].required_access_level;

          // Step 5: Compare subscription level with required access level
          if (accessLevels[userSubscription.subscription_plan] < accessLevels[requiredAccessLevel]) {
            return res.redirect('/dashboard');
          }

          // If the user has the required access, render the page
          // Dynamically include content based on subscription plan
          const content = getContentForSubscription(userSubscription.subscription_plan);
          res.render('premiumContent', { content: content });
        });
      });
    });
  }
};

// Helper function to determine the content based on subscription plan
function getContentForSubscription(plan) {
  switch (plan) {
    case 'starter':
      return 'starter_content.html';
    case 'business':
      return 'business_content.html';
    case 'enterprise':
      return 'enterprise_content.html';
    default:
      return '<p>No content available for your subscription level.</p>';
  }
}

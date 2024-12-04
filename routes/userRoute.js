require('dotenv').config(); // Load environment variables from .env file

const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const mysql = require('mysql2');

// Create Express router
const router = express.Router();

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

// Middleware for verifying token
const authenticateToken = (req, res, next) => {
  const token = req.headers['authorization'];
  if (token == null) return res.status(401).send('Token is required');

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).send('Invalid or expired token');
    req.user = user;
    next();
  });
};

// User registration route
router.post('/register', async (req, res) => {
  const { username, password, email } = req.body;

  if (!username || !password || !email) {
    return res.status(400).send('Please provide username, password, and email');
  }

  try {
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const query = 'INSERT INTO users (username, password, email) VALUES (?, ?, ?)';
    db.execute(query, [username, hashedPassword, email], (err, results) => {
      if (err) {
        return res.status(500).send('Error saving user to database');
      }
      res.status(201).send('User registered successfully');
    });
  } catch (err) {
    res.status(500).send('Error hashing password');
  }
});

// User login route
router.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).send('Please provide username and password');
  }

  const query = 'SELECT id, password FROM users WHERE username = ? LIMIT 1';
  db.execute(query, [username], async (err, results) => {
    if (err) {
      return res.status(500).send('Database error');
    }
    if (results.length === 0) {
      return res.status(404).send('User not found');
    }

    const user = results[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(403).send('Invalid credentials');
    }

    // Generate JWT token
    const token = jwt.sign({ id: user.id, username }, process.env.JWT_SECRET, {
      expiresIn: '1h',
    });

    res.status(200).json({ token });
  });
});

// Subscription validation route
router.get('/validate-subscription', authenticateToken, (req, res) => {
  const userId = req.user.id; // Retrieved from the token

  const query = 'SELECT subscription_plan, end_date FROM subscriptions WHERE user_id = ? AND status = "active" LIMIT 1';
  db.execute(query, [userId], (err, results) => {
    if (err) {
      return res.status(500).send('Database error');
    }
    if (results.length === 0) {
      return res.status(404).send('No active subscription found');
    }

    const userSubscription = results[0];
    const currentDate = new Date();
    const trialEndDate = new Date(userSubscription.end_date);

    // Check if the user is in their trial period and assign enterprise access
    if (userSubscription.subscription_plan === 'trial' && currentDate <= trialEndDate) {
      userSubscription.subscription_plan = 'enterprise'; // Grant enterprise access during trial
    }

    res.status(200).json({ subscription: userSubscription });
  });
});

// Content access route based on subscription plan
router.get('/premium-content', authenticateToken, (req, res) => {
  const userId = req.user.id;

  const query = 'SELECT subscription_plan FROM subscriptions WHERE user_id = ? AND status = "active" LIMIT 1';
  db.execute(query, [userId], (err, results) => {
    if (err) {
      return res.status(500).send('Database error');
    }

    if (results.length === 0) {
      return res.status(403).send('No active subscription found');
    }

    const subscriptionPlan = results[0].subscription_plan;
    const requiredAccessLevel = 'enterprise'; // Change this based on the page content you're protecting

    // Compare subscription levels
    if (accessLevels[subscriptionPlan] < accessLevels[requiredAccessLevel]) {
      return res.status(403).send('Access denied. Upgrade your subscription.');
    }

    // Allow access to premium content
    res.status(200).send(`Welcome to the ${subscriptionPlan} content.`);
  });
});

module.exports = router;

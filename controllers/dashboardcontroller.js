const db = require('../config/db');
const session = require('express-session');
const dayjs = require('day'); // Fixed 'day' to 'dayjs'
const salesModel = require('../models/sales');
const inventoryModel = require('../models/inventory');
const productModel = require('../models/product');
const userModel = require('../models/user');

// Middleware to handle sessions
const sessionMiddleware = session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: true,
  cookie: {
    maxAge: 86400 * 1000, // 1 day
    secure: true,
    httpOnly: true,
  },
});

// Function to get total revenue based on range
const getRevenueQuery = (range) => {
  switch (range) {
    case 'year':
      return `...`; // your SQL query
    case 'week':
      return `...`; // your SQL query
    default:
      return `...`; // your SQL query
  }
};

// Fetch dashboard data
const getDashboardData = async (req, res) => {
  const range = req.query.range || 'month';
  const username = req.session.username || null;

  try {
    // Fetch data logic

    // Send response back
    res.status(200).json(response);
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
};

module.exports = {
  sessionMiddleware,
  getDashboardData,
};

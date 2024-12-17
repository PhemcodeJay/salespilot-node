const express = require('express');
const router = express.Router();
const { pool } = require('../models/db'); // Using a pre-configured connection pool
const bodyParser = require('body-parser');
const session = require('express-session');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Session setup
router.use(
  session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false, httpOnly: true, maxAge: 86400 * 1000 }, // 24 hours
  })
);

// Middleware to check if the user is logged in
const isAuthenticated = (req, res, next) => {
  if (!req.session.username) {
    return res.status(401).json({ success: false, message: 'Authentication required.' });
  }
  next();
};

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadsDir = path.join(__dirname, '..', 'uploads');
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  },
});
const upload = multer({ storage });

// GET route for categories and products
router.get('/categories', isAuthenticated, async (req, res) => {
  try {
    const username = req.session.username;

    // Retrieve user information
    const [userResult] = await pool.promise().query(
      'SELECT username, email, date FROM users WHERE username = ?',
      [username]
    );

    if (userResult.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }
    const { email, date } = userResult[0];

    // Fetch categories and products
    const [categories] = await pool.promise().query(
      'SELECT category_id, category_name FROM categories'
    );

    const [products] = await pool.promise().query(
      `
      SELECT 
        p.id AS product_id, p.name AS product_name, p.description, p.price, p.image_path, 
        p.inventory_qty, c.category_name 
      FROM products p
      JOIN categories c ON p.category_id = c.category_id
      `
    );

    res.json({
      success: true,
      user: { email, date },
      categories,
      products,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.', error: err.message });
  }
});
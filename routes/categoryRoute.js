const express = require('express');
const router = express.Router();
const { pool } = require('../models/db'); // Using the pre-configured connection pool
const session = require('express-session');
const productController = require('../controllers/productcontroller'); // Corrected controller file for products
const { checkLogin } = require('../middleware/auth'); // Import middleware


// Session setup
router.use(
  session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false, httpOnly: true, maxAge: 86400 * 1000 }, // 24 hours
  })
);

// GET route for categories and products (view-only)
router.get('/categories', checkLogin, async (req, res) => {
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

    // Fetch categories and products from the controller
    const categories = await productController.listCategories();  // Assuming this method exists
    const products = await productController.listProducts();      // Assuming this method exists

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

// Export the router
module.exports = router;
const express = require('express');
const mysql = require('mysql2');
const session = require('express-session');
const bodyParser = require('body-parser');
const router = express.Router();

// Create MySQL connection
const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'salespilot'
});

// Session setup
router.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false, httpOnly: true, maxAge: 86400 * 1000 } // 24 hours
}));

router.use(bodyParser.urlencoded({ extended: true }));
router.use(bodyParser.json());

// Middleware to check if the user is logged in
function isAuthenticated(req, res, next) {
  if (!req.session.username) {
    return res.json({ success: false, message: "No username found in session." });
  }
  next();
}

// GET route for fetching category and product data
router.get('/categories', isAuthenticated, (req, res) => {
  const username = req.session.username;

  // Retrieve user information
  const userQuery = 'SELECT username, email, date FROM users WHERE username = ?';
  connection.execute(userQuery, [username], (err, userResult) => {
    if (err) {
      return res.json({ success: false, message: "Database error: " + err.message });
    }

    const userInfo = userResult[0];
    if (!userInfo) {
      return res.json({ success: false, message: "User not found." });
    }

    const { email, date } = userInfo;

    // Fetch categories
    const fetchCategoriesQuery = 'SELECT category_id, category_name FROM categories';
    connection.execute(fetchCategoriesQuery, [], (err, categoriesResult) => {
      if (err) {
        return res.json({ success: false, message: "Database error: " + err.message });
      }

      const categories = categoriesResult;

      // Fetch products with categories
      const fetchProductsQuery = `
        SELECT 
          p.id AS product_id, p.name AS product_name, p.description, p.price, p.image_path, 
          p.inventory_qty, c.category_name 
        FROM products p
        JOIN categories c ON p.category_id = c.category_id
      `;
      connection.execute(fetchProductsQuery, [], (err, productsResult) => {
        if (err) {
          return res.json({ success: false, message: "Database error: " + err.message });
        }

        const products = productsResult;

        // Send response
        res.json({
          success: true,
          user: { email, date },
          categories,
          products
        });
      });
    });
  });
});

// POST route for updating product information
router.post('/update-product', isAuthenticated, (req, res) => {
  const { id, field, value } = req.body;

  // Validate input fields
  const allowedFields = ['name', 'description', 'category', 'price'];
  if (!allowedFields.includes(field)) {
    return res.json({ success: false, message: 'Invalid field' });
  }

  // Prepare and execute the update query
  const updateQuery = `UPDATE products SET ?? = ? WHERE id = ?`;
  connection.execute(updateQuery, [field, value, id], (err, result) => {
    if (err) {
      return res.json({ success: false, message: "Error: " + err.message });
    }

    if (result.affectedRows > 0) {
      return res.json({ success: true });
    } else {
      return res.json({ success: false, message: 'Update failed' });
    }
  });
});

// GET route for fetching inventory notifications
router.get('/inventory-notifications', isAuthenticated, (req, res) => {
  const inventoryQuery = `
    SELECT i.product_name, i.available_stock, i.inventory_qty, i.sales_qty, p.image_path
    FROM inventory i
    JOIN products p ON i.product_id = p.id
    WHERE i.available_stock < ? OR i.available_stock > ?
    ORDER BY i.last_updated DESC
  `;
  connection.execute(inventoryQuery, [10, 1000], (err, inventoryResult) => {
    if (err) {
      return res.json({ success: false, message: "Database error: " + err.message });
    }

    // Fetch reports notifications with product images
    const reportsQuery = `
      SELECT JSON_UNQUOTE(JSON_EXTRACT(revenue_by_product, '$.product_name')) AS product_name, 
             JSON_UNQUOTE(JSON_EXTRACT(revenue_by_product, '$.revenue')) AS revenue, 
             p.image_path
      FROM reports r
      JOIN products p ON JSON_UNQUOTE(JSON_EXTRACT(revenue_by_product, '$.product_id')) = p.id
      WHERE JSON_UNQUOTE(JSON_EXTRACT(revenue_by_product, '$.revenue')) > ? 
         OR JSON_UNQUOTE(JSON_EXTRACT(revenue_by_product, '$.revenue')) < ?
      ORDER BY r.report_date DESC
    `;
    connection.execute(reportsQuery, [10000, 1000], (err, reportsResult) => {
      if (err) {
        return res.json({ success: false, message: "Database error: " + err.message });
      }

      res.json({
        success: true,
        inventoryNotifications: inventoryResult,
        reportsNotifications: reportsResult
      });
    });
  });
});

module.exports = router;

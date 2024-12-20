const express = require('express');
const productController = require('../controllers/productcontroller'); // Corrected controller file for products
const router = express.Router();
const { checkLogin } = require('../middleware/auth'); // Import middleware

// Middleware to parse incoming JSON requests
router.use(express.json());

// Get all inventory records (products)
router.get('/inventory', productController.listInventory);

// Export the router
module.exports = router;

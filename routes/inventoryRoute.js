const express = require('express');
const productController = require('../controllers/productcontroller'); // Updated controller file
const router = express.Router();

// Middleware to parse incoming JSON requests
router.use(express.json());

// Get Inventory Data
router.get('/inventory', productController.getInventoryData);

// Update Product Stock
router.put('/inventory/update/:id', productController.updateProductStock);

// Generate PDF Report for Inventory
router.get('/inventory/pdf', productController.generateInventoryPDF);

// Export the router
module.exports = router;

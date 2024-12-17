const express = require('express');
const path = require('path');
const router = express.Router();
const notificationController = require('../controllers/notification');
const authController = require('../controllers/authcontroller');
const productController = require('../controllers/productcontroller');
const salesController = require('../controllers/salescontroller');
const profileController = require('../controllers/profilecontroller');
const pool = require('../models/db'); // Import the database connection
const verifyToken = require('../verifyToken');
const dashboardController = require('../controllers/dashboardController'); // New Controller for Dashboard

// Serve dashboard.html as static from the public folder
router.get('/api/dashboard', async (req, res) => {
  try {
    // Call the dashboard controller to get the data
    const dashboardData = await dashboardController.getDashboardData(req, res);
    
    // Send the response with the data
    res.json(dashboardData);
  } catch (error) {
    console.error('Error in dashboard route:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

// Serve the static dashboard page
router.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'dashboard.html'));
});

// Define other routes for notifications, authentication, products, sales, and profile
router.use('/api/notifications', notificationController);
router.use('/api/auth', authController);
router.use('/api/products', productController);
router.use('/api/sales', salesController);
router.use('/api/profile', profileController);

// Example of a protected route with token verification
router.get('/api/secure-data', verifyToken, (req, res) => {
  res.status(200).json({ message: 'Secure data accessed successfully!' });
});

module.exports = router;

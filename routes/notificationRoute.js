const express = require('express');
const router = express.Router();

// Import the controller functions
const { fetchInventoryNotifications, fetchReportsNotifications } = require('../controllers/notificationcontroller');

// Define the routes and map them to controller functions
router.get('/inventory-notifications', fetchInventoryNotifications);  // Route for inventory notifications
router.get('/reports-notifications', fetchReportsNotifications);      // Route for reports notifications

// Export the router to be used in app.js
module.exports = router;

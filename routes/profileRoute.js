const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profilecontroller'); // Make sure the path is correct
const pool = require('../models/db'); // Import the database connection
const session = require('express-session');
const verifyToken = require('../verifyToken');

// Get user profile by ID
router.get('/profile/:userId', profileController.getUserProfile);

// Update user profile by ID
router.put('/profile/:userId', profileController.updateUserProfile);

// Delete user profile by ID
router.delete('/profile/:userId', profileController.deleteUserProfile);

// Get subscription status for a user by ID
router.get('/subscription/:userId', profileController.getSubscriptionStatus);

// Process payment and update subscription status
router.post('/payment', profileController.processPayment);

module.exports = router;
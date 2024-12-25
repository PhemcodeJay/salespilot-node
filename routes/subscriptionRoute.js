const express = require('express');
const { checkSubscriptionAndProcessPayment, getPaymentsByUser, getPaymentById, updatePaymentStatus } = require('../controllers/paycontroller');
const { checkAndDeactivateSubscriptions } = require('../controllers/subscriptioncontroller');
const profileController = require('../controllers/profilecontroller');
const authController = require('../controllers/authcontroller');
const { checkLogin } = require('../middleware/auth'); // Import middleware
const { check } = require('express-validator');
const router = express.Router();

// ========================
// Auth Routes
// ========================

// Route to log in a user
router.post('/auth/login', authController.login);

// User registration
router.post('/auth/signup', authController.signup);

// User logout
router.post('/auth/logout', checkLogin, authController.logout);

// ========================
// Profile Routes
// ========================

// Fetch user profile
router.get('/profile', checkLogin, profileController.getUserProfile);

// Update user profile
router.put('/profile/update', checkLogin, profileController.updateUserProfile);

// Update user password
router.put('/profile/password', checkLogin, profileController.updatePassword);

// ========================
// Payment Routes
// ========================

// Route to process payment and check subscription
router.post('/payments/process', checkLogin, checkSubscriptionAndProcessPayment);

// Route to get all payments for a specific user
router.get('/payments/user/:user_id', checkLogin, getPaymentsByUser);

// Route to get a specific payment by ID
router.get('/payments/:payment_id', checkLogin, getPaymentById);

// Route to update payment status
router.put('/payments/:payment_id/status', checkLogin, updatePaymentStatus);

// ========================
// Subscription Routes
// ========================

// Route to manually deactivate expired subscriptions
router.get('/subscriptions/deactivate-expired', checkLogin, async (req, res) => {
  try {
    await checkAndDeactivateSubscriptions();
    res.status(200).json({ message: 'Checked and deactivated expired subscriptions' });
  } catch (error) {
    console.error('Error deactivating expired subscriptions:', error);
    res.status(500).json({ error: 'Failed to deactivate expired subscriptions' });
  }
});

// ========================
// Export Router
// ========================
module.exports = router;

const express = require('express');
const {
  checkSubscriptionAndProcessPayment,
  getPaymentsByUser,
  getPaymentById,
  updatePaymentStatus,
} = require('../controllers/paycontroller');
const { checkAndDeactivateSubscriptions } = require('../controllers/subscriptioncontroller');
const profileController = require('../controllers/profilecontroller');
const authController = require('../controllers/authcontroller');
const verifyToken = require('../verifyToken'); // Middleware for authentication
const router = express.Router();

// ========================
// Auth Routes
// ========================

// User login
router.post('/auth/login', authController.loginUser);

// User registration
router.post('/auth/register', authController.registerUser);

// User logout
router.post('/auth/logout', verifyToken, authController.logoutUser);

// ========================
// Profile Routes
// ========================

// Fetch user profile
router.get('/profile', verifyToken, profileController.getProfile);

// Update user profile
router.put('/profile/update', verifyToken, profileController.updateProfile);

// Update user password
router.put('/profile/password', verifyToken, profileController.updatePassword);

// ========================
// Payment Routes
// ========================

// Route to process payment and check subscription
router.post('/payments/process', verifyToken, checkSubscriptionAndProcessPayment);

// Route to get all payments for a specific user
router.get('/payments/user/:user_id', verifyToken, getPaymentsByUser);

// Route to get a specific payment by ID
router.get('/payments/:payment_id', verifyToken, getPaymentById);

// Route to update payment status
router.put('/payments/:payment_id/status', verifyToken, updatePaymentStatus);

// ========================
// Subscription Routes
// ========================

// Route to manually deactivate expired subscriptions
router.get('/subscriptions/deactivate-expired', verifyToken, async (req, res) => {
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

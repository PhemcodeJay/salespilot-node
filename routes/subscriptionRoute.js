const express = require('express');
const {
  checkSubscriptionAndProcessPayment,
  getPaymentsByUser,
  getPaymentById,
  updatePaymentStatus,
} = require('../controllers/paycontroller');
const {
  checkAndDeactivateSubscriptions,
  renderPayPage,
  renderSubscriptionPage,
} = require('../controllers/subscriptioncontroller');
const { checkLogin } = require('../middleware/auth');

const router = express.Router();


// ========================
// API Routes
// ========================

// Deactivate expired subscriptions
router.get('/subscriptions/deactivate-expired', checkLogin, async (req, res) => {
  try {
    await checkAndDeactivateSubscriptions();
    res.status(200).json({ message: 'Checked and deactivated expired subscriptions' });
  } catch (error) {
    console.error('Error deactivating expired subscriptions:', error.message);
    res.status(500).json({ error: 'Failed to deactivate expired subscriptions' });
  }
});

// Process payment and check subscription
router.post('/payments/process', checkLogin, checkSubscriptionAndProcessPayment);

// Get payments for a specific user
router.get('/payments/user/:user_id', checkLogin, getPaymentsByUser);

// Get a specific payment by ID
router.get('/payments/:payment_id', checkLogin, getPaymentById);

// Update payment status
router.put('/payments/:payment_id/status', checkLogin, updatePaymentStatus);

// ========================
// Export Router
// ========================
module.exports = router;

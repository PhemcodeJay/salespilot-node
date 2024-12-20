const express = require('express');
const {
  checkSubscriptionAndProcessPayment,
  getPaymentsByUser,
  getPaymentById,
  updatePaymentStatus,
} = require('../controllers/paycontroller');
const {
  checkAndDeactivateSubscriptions,
  activateSubscription,
} = require('../controllers/subscriptioncontroller');
const profileController = require('../controllers/profilecontroller');
const authController = require('../controllers/authcontroller');
const { checkLogin } = require('../middleware/auth'); // Import middleware
const { check } = require('express-validator');
const router = express.Router();

// ========================
// Auth Routes
// ========================

// Correctly route to authController.login
router.post('/auth/login', authController.login);  // Ensure this points to login function

// User registration
router.post('/auth/register', authController.signup);

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

// Route to handle PayPal webhook for subscription activation
router.post('/paypal/webhook', async (req, res) => {
  const payload = req.body;

  if (!payload || !payload.event_type) {
    return res.status(400).json({ error: 'Invalid webhook payload' });
  }

  try {
    const eventType = payload.event_type;

    switch (eventType) {
      case 'BILLING.SUBSCRIPTION.ACTIVATED':
        const subscriptionId = payload.resource.id;
        const planId = payload.resource.plan_id;

        // Example function - ensure this is defined and imported correctly
        const userId = await getUserIdBySubscription(subscriptionId);

        const planName = getPlanName(planId);
        if (planName) {
          await activateSubscription(subscriptionId, planName, userId);
          res.json({ status: 'Subscription activated' });
        } else {
          throw new Error(`Unknown plan ID: ${planId}`);
        }
        break;

      case 'PAYMENT.SALE.COMPLETED':
        const saleId = payload.resource.id;
        const amount = payload.resource.amount.total;

        // Example function - ensure this is defined and imported correctly
        const saleUserId = await getUserIdByPayment(saleId);

        await recordPayment(saleId, amount, saleUserId);
        res.json({ status: 'Payment recorded' });
        break;

      default:
        throw new Error(`Unhandled event type: ${eventType}`);
    }
  } catch (err) {
    console.error('Webhook processing error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ========================
// Export Router
// ========================
module.exports = router;

// Define the missing functions (or import them if they already exist elsewhere)
async function getUserIdBySubscription(subscriptionId) {
  // Placeholder function - implement actual logic to get user ID from subscription ID
  return 'user_id_example';
}

function getPlanName(planId) {
  // Placeholder function - implement actual logic to get plan name from plan ID
  const plans = {
    'plan_123': 'Premium Plan',
    'plan_456': 'Basic Plan',
  };
  return plans[planId];
}

async function getUserIdByPayment(saleId) {
  // Placeholder function - implement actual logic to get user ID from sale ID
  return 'user_id_example';
}

async function recordPayment(saleId, amount, userId) {
  // Placeholder function - implement actual logic to record the payment
  console.log(`Payment recorded: Sale ID: ${saleId}, Amount: ${amount}, User ID: ${userId}`);
}

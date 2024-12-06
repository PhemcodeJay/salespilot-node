const express = require('express');
const { checkSubscriptionAndProcessPayment, getPaymentsByUser, getPaymentById, updatePaymentStatus } = require('../controllers/paycontroller');
const { checkAndDeactivateSubscriptions } = require('../controllers/subscriptioncontroller');
const proileController = require('../controllers/profilecontroller');
const authController = require('../controllers/authcontroller');

const router = express.Router();

// Route to check the subscription status and process payment
router.post('/process-payment', checkSubscriptionAndProcessPayment);

// Route to get all payments made by a specific user
router.get('/payments/:user_id', getPaymentsByUser);

// Route to get a specific payment by its ID
router.get('/payment/:payment_id', getPaymentById);

// Route to update the payment status
router.put('/payment-status/:payment_id', updatePaymentStatus);

// Route to manually check and deactivate expired subscriptions
router.get('/deactivate-expired-subscriptions', async (req, res) => {
  try {
    await checkAndDeactivateSubscriptions();
    res.status(200).json({ message: 'Checked and deactivated expired subscriptions' });
  } catch (error) {
    console.error('Error deactivating expired subscriptions:', error);
    res.status(500).json({ error: 'Failed to deactivate expired subscriptions' });
  }
});

// Export the router to be used in the main server file
module.exports = router;

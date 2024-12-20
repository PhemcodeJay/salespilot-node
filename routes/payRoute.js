const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paycontroller');
const { checkLogin } = require('../middleware/auth'); // Import middleware


// Route to check subscription status and process payment
router.post(
  '/check-subscription',
  checkLogin, // Ensure the user is authenticated
  paymentController.checkSubscriptionAndProcessPayment
);

// Route to get all payments by user
router.get(
  '/payments/:user_id',
  checkLogin, // Ensure the user is authenticated
  paymentController.getPaymentsByUser
);

// Route to get a specific payment by ID
router.get(
  '/payment/:payment_id',
  checkLogin, // Ensure the user is authenticated
  paymentController.getPaymentById
);

// Route to update payment status
router.put(
  '/payment-status/:payment_id',
  checkLogin, // Ensure the user is authenticated
  paymentController.updatePaymentStatus
);

module.exports = router;

const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paycontroller');
const verifyToken = require('../verifyToken'); // Middleware to verify user authentication

// Route to check subscription status and process payment
router.post(
  '/check-subscription',
  verifyToken, // Ensure the user is authenticated
  paymentController.checkSubscriptionAndProcessPayment
);

// Route to get all payments by user
router.get(
  '/payments/:user_id',
  verifyToken, // Ensure the user is authenticated
  paymentController.getPaymentsByUser
);

// Route to get a specific payment by ID
router.get(
  '/payment/:payment_id',
  verifyToken, // Ensure the user is authenticated
  paymentController.getPaymentById
);

// Route to update payment status
router.put(
  '/payment-status/:payment_id',
  verifyToken, // Ensure the user is authenticated
  paymentController.updatePaymentStatus
);

module.exports = router;

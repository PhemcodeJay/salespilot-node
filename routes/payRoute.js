const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paycontroller');

// Route to check subscription status and process payment
router.post('/check-subscription', paymentController.checkSubscriptionAndProcessPayment);

// Route to get all payments by user
router.get('/payments/:user_id', paymentController.getPaymentsByUser);

// Route to get a specific payment by ID
router.get('/payment/:payment_id', paymentController.getPaymentById);

// Route to update payment status
router.put('/payment-status/:payment_id', paymentController.updatePaymentStatus);

module.exports = router;

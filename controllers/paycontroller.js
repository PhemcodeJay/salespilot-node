const Payment = require('../models/payment');
const Subscription = require('../models/subscription');

exports.checkSubscriptionAndProcessPayment = async (req, res) => {
  const { user_id, payment_method, payment_proof, payment_amount, payment_status } = req.body;

  try {
    // Step 1: Check if the user has an active subscription
    const activeSubscription = await Subscription.getSubscriptionStatus(user_id);

    // Step 2: If no active subscription, check if it's a free trial or regular subscription
    if (!activeSubscription) {
      const freeTrial = await Subscription.createFreeTrial(user_id); // Automatically assign free trial if no active subscription

      // Handle payment for free trial
      const paymentData = {
        user_id,
        payment_method,
        payment_proof,
        payment_amount: 0, // Free trial doesn't require payment
        payment_status: 'completed', // Mark as completed for free trial
        subscription_id: freeTrial.id,
      };

      await Payment.createPayment(paymentData);
      return res.status(200).json({ message: 'Free trial started successfully' });
    }

    // Step 3: If the subscription is active, handle payment for the plan
    const subscriptionId = activeSubscription.id;
    const paymentData = {
      user_id,
      payment_method,
      payment_proof,
      payment_amount,
      payment_status: payment_status || 'pending',
      subscription_id: subscriptionId,
    };

    // Create a payment record
    const payment = await Payment.createPayment(paymentData);

    // Step 4: If the payment was successful, upgrade or renew the subscription
    if (payment_status === 'completed') {
      // You can handle the upgrade or renewal logic here
      // For example, upgrading to a different plan or renewing the subscription
      await Subscription.upgradeSubscription(user_id, 'Premium'); // Upgrade to a new plan (if applicable)
    }

    res.status(200).json({ message: 'Payment processed successfully', payment });
  } catch (error) {
    console.error('Error processing payment:', error);
    res.status(500).json({ error: 'Failed to process payment' });
  }
};

exports.getPaymentsByUser = async (req, res) => {
  const { user_id } = req.params;

  try {
    const payments = await Payment.getPaymentsByUserId(user_id);
    res.json({ payments });
  } catch (error) {
    console.error('Error fetching payments:', error);
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
};

exports.getPaymentById = async (req, res) => {
  const { payment_id } = req.params;

  try {
    const payment = await Payment.getPaymentById(payment_id);
    res.json({ payment });
  } catch (error) {
    console.error('Error fetching payment:', error);
    res.status(500).json({ error: 'Failed to fetch payment' });
  }
};

exports.updatePaymentStatus = async (req, res) => {
  const { payment_id } = req.params;
  const { payment_status } = req.body;

  try {
    const success = await Payment.updatePaymentStatus(payment_id, payment_status);
    if (success) {
      res.json({ message: 'Payment status updated successfully' });
    } else {
      res.status(404).json({ error: 'Payment not found' });
    }
  } catch (error) {
    console.error('Error updating payment status:', error);
    res.status(500).json({ error: 'Failed to update payment status' });
  }
};

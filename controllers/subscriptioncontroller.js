const mysql = require('mysql2');
const { DateTime } = require('luxon');
const express = require('express');
const { checkAndDeactivateSubscriptions } = require('../controllers/subscriptioncontroller');
const app = express();

app.use(express.json()); // Middleware for JSON payloads

// MySQL Connection
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'dbs13455438'
});

// Middleware to check if user is logged in
const isLoggedIn = (req, res, next) => {
  if (!req.session || !req.session.username) {
    return res.status(401).json({ error: 'User not logged in' });
  }
  next();
};

// Fetch user information
app.get('/user/info', isLoggedIn, async (req, res) => {
  try {
    const username = req.session.username;

    const [results] = await db.promise().execute(
      'SELECT username, email, date, phone, location, user_image FROM users WHERE username = ?',
      [username]
    );

    if (!results.length) {
      throw new Error('User not found');
    }

    const user = results[0];
    user.date = DateTime.fromISO(user.date).toFormat('dd LLLL, yyyy');
    user.user_image = user.user_image || 'uploads/user/default.png';

    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Payment Form Submission
app.post('/payment/submit', async (req, res) => {
  const { payment_amount = 0, payment_method = 'Cash', payment_status = 'Pending' } = req.body;

  try {
    await db.promise().execute(
      'INSERT INTO payments (payment_amount, payment_method, payment_status) VALUES (?, ?, ?)',
      [payment_amount, payment_method, payment_status]
    );
    res.json({ message: 'Payment recorded successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Payment submission failed', details: err.message });
  }
});

// PayPal Webhook Handling
app.post('/paypal/webhook', async (req, res) => {
  const payload = req.body;

  if (!payload || !payload.event_type) {
    return res.status(400).json({ error: 'Invalid webhook payload' });
  }

  try {
    const eventType = payload.event_type;

    switch (eventType) {
      case 'BILLING.SUBSCRIPTION.ACTIVATED':
        await handleSubscriptionActivated(payload);
        res.json({ status: 'Subscription activated' });
        break;

      case 'PAYMENT.SALE.COMPLETED':
        await handlePaymentCompleted(payload);
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

// Handle Subscription Activated Event
const handleSubscriptionActivated = async (payload) => {
  const subscriptionId = payload.resource.id;
  const planId = payload.resource.plan_id;
  const userId = await getUserIdBySubscription(subscriptionId);

  const planName = getPlanName(planId);
  if (planName) {
    await activateSubscription(subscriptionId, planName, userId);
  } else {
    throw new Error(`Unknown plan ID: ${planId}`);
  }
};

// Handle Payment Sale Completed Event
const handlePaymentCompleted = async (payload) => {
  const saleId = payload.resource.id;
  const amount = payload.resource.amount.total;
  const saleUserId = await getUserIdByPayment(saleId);

  await recordPayment(saleId, amount, saleUserId);
};

// Functions to Get Plan Name and Manage Subscriptions
const getPlanName = (planId) => {
  const plans = {
    'P-92V01000GH171635WM5HYGRQ': 'starter',
    'P-6TP94103DT2394623M5HYFKY': 'business',
    'P-7E210255TM029860GM5HYC4A': 'enterprise'
  };
  return plans[planId] || null;
};

const activateSubscription = async (subscriptionId, planName, userId) => {
  try {
    await db.promise().execute(
      'INSERT INTO subscriptions (user_id, subscription_plan, status) VALUES (?, ?, "active")',
      [userId, planName]
    );
    console.log(`Subscription activated: ID = ${subscriptionId}, Plan = ${planName}`);
  } catch (error) {
    console.error('Error activating subscription:', error.message);
  }
};

const recordPayment = async (saleId, amount, userId) => {
  try {
    await db.promise().execute(
      'INSERT INTO payments (user_id, payment_method, payment_amount, payment_status, sale_id) VALUES (?, "paypal", ?, "completed", ?)',
      [userId, amount, saleId]
    );
    console.log(`Payment recorded: Sale ID = ${saleId}, Amount = ${amount}`);
  } catch (error) {
    console.error('Error recording payment:', error.message);
  }
};

const getUserIdBySubscription = async (subscriptionId) => {
  const [results] = await db.promise().execute(
    'SELECT user_id FROM subscriptions WHERE subscription_id = ?',
    [subscriptionId]
  );
  return results.length ? results[0].user_id : null;
};

const getUserIdByPayment = async (saleId) => {
  const [results] = await db.promise().execute(
    'SELECT user_id FROM payments WHERE sale_id = ?',
    [saleId]
  );
  return results.length ? results[0].user_id : null;
};

// Start the server
const PORT = 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));


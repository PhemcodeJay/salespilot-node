const express = require('express');
const router = express.Router();
const authcontroller = require('../controllers/authcontroller');

// Signup route
router.post('/auth/signup', authcontroller.signup);

// Activate account route
router.post('/auth/activate', authcontroller.activateAccount);

// Login route
router.post('/auth/login', authcontroller.login);

// Feedback route
router.post('/auth/feedback', authcontroller.sendFeedback);

// Subscription route
router.post('/subscription', authcontroller.manageSubscription);

module.exports = router;
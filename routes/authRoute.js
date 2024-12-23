const express = require('express');
const router = express.Router();
const authcontroller = require('../controllers/authcontroller');

// Signup route
router.post('/signup', authcontroller.signup);

// Activate account route
router.post('/activate', authcontroller.activateAccount);

// Login route
router.post('/login', authcontroller.login);

// Feedback route
router.post('/feedback', authcontroller.sendFeedback);

// Subscription route
router.post('/subscription', authcontroller.manageSubscription);

module.exports = router;
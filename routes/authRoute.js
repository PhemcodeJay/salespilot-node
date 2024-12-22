const express = require('express');
const router = express.Router();
const authController = require('../controllers/authcontroller');

// Signup route
router.post('/signup', authController.signup);

// Login route
router.post('/login', authController.login);

// Logout route
router.post('/logout', authController.logout);

// Feedback route
router.post('/feedback', authController.sendFeedback);

module.exports = router;

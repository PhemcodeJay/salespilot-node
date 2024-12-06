const express = require('express');
const path = require('path');
const authController = require('../controllers/authcontroller'); // Import the controller

const router = express.Router();

// Static File Routes
router.use(express.static(path.join(__dirname, '../public')));

// Serve HTML Pages
router.get('/signup', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/signup.html'));
});
router.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/login.html'));
});
router.get('/recoverpwd', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/recoverpwd.html'));
});
router.get('/activate', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/activate.html'));
});

// Auth API Routes
router.post('/signup', authController.signup); // User registration
router.post('/login', authController.login); // Login
router.post('/request-password-reset', authController.requestPasswordReset); // Request password reset
router.post('/reset-password', authController.resetPassword); // Reset password
router.post('/activate', authController.activateAccount); // Account activation
router.get('/activate/:token', authController.activateAccount); // Activation via token (optional)

// Export the Router
module.exports = router;

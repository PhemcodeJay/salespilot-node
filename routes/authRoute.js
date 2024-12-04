const express = require('express');
const path = require('path');
const authController = require('../controllers/authcontroller'); // Import the controller

const router = express.Router();

// Serve static files from the 'public' folder
router.use(express.static(path.join(__dirname, '../public')));

// Serve the signup page
router.get('/signup', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/signup.html'));
});

// Serve the login page
router.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/login.html'));
});

// Serve the password recovery page
router.get('/recoverpwd', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/recoverpwd.html'));
});

// Serve the account activation page
router.get('/activate', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/activate.html'));
});

// User Registration Route
router.post('/signup', authController.signup);

// Login Route
router.post('/login', authController.login);

// Password Reset Request Route
router.post('/password-reset', authController.passwordReset);

// Reset Password Route
router.post('/reset-password', authController.resetPassword);

module.exports = router;

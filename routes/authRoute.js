// Import required modules
const express = require('express');
const path = require('path');
const authController = require('../controllers/authcontroller'); // Import the controller
const router = express.Router();
const session = require('express-session');
const pool = require('../models/db'); // Import the database connection
const { checkLogin } = require('../middleware/auth'); // Import middleware



// Static File Routes
router.use(express.static(path.join(__dirname, '../views/auth')));

// Serve static pages
router.get('/signup', (req, res) => res.sendFile(path.join(__dirname, '../views/auth/signup.html')));
router.get('/login', (req, res) => res.sendFile(path.join(__dirname, '../views/auth/login.html')));
router.get('/activate', (req, res) => res.sendFile(path.join(__dirname, '../views/auth/activate.html')));

// Serve the 'recoverpwd.html' page for password recovery
router.get('/recoverpwd', (req, res) => {
    const { csrf_token } = req.session; // Assuming CSRF token is stored in session
    const { token: reset_code } = req.query; // Token passed in the URL for validation

    if (reset_code && csrf_token) {
        res.sendFile(path.join(__dirname, '../views/auth/recoverpwd.html'));
    } else {
        res.status(400).json({ message: 'Invalid or missing reset code or CSRF token' });
    }
});

// Serve the 'passwordreset.html' page for password reset
router.get('/passwordreset', (req, res) => {
    const { token: reset_code } = req.query; // Token passed in the URL for password reset

    if (reset_code) {
        res.sendFile(path.join(__dirname, '../views/auth/passwordreset.html'));
    } else {
        res.status(400).json({ message: 'Invalid or missing reset code' });
    }
});

// Auth API Routes
router.post('/signup', authController.signup); // User registration
router.post('/login', authController.login); // User login
router.post('/request-password-reset', authController.requestPasswordReset); // Request password reset
router.post('/reset-password', authController.resetPassword); // Reset password
router.post('/activate', authController.activateAccount); // Account activation (activation code provided in body)

// Account activation via token passed in URL or body
router.get('/activate/:token', authController.activateAccount); // Token in URL
router.post('/activate/:token', authController.activateAccount); // Token in request body

// Protect a route (Example with checkLogin middleware)
router.get('/protected', checkLogin, (req, res) => {
    res.json({ message: 'This is a protected route.', user: req.user });
});

// Export the router
module.exports = router;

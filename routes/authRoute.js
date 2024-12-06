const express = require('express');
const path = require('path');
const authController = require('../controllers/authcontroller'); // Import the controller

const router = express.Router();

// Static File Routes
router.use(express.static(path.join(__dirname, '../public')));

// Serve the 'signup.html' page for user registration
router.get('/signup', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/signup.html'));
});

// Serve the 'login.html' page for user login
router.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/login.html'));
});

// Serve the 'recoverpwd.html' page for password recovery
router.get('/recoverpwd', (req, res) => {
    const csrf_token = req.session.csrf_token;  // Assuming CSRF token is stored in session
    const reset_code = req.query.token;  // Token passed in the URL for validation

    // If reset code is provided in the query, serve the 'recoverpwd.html' page
    if (reset_code) {
        res.sendFile(path.join(__dirname, '../public/recoverpwd.html')); // Serve recoverpwd.html
    } else {
        res.status(400).send('Invalid or missing reset code');
    }
});

// Serve the 'passwordreset.html' page to reset the password
router.get('/passwordreset', (req, res) => {
    const reset_code = req.query.token;  // Token passed in the URL for password reset

    // If reset code is provided, serve the 'passwordreset.html' page
    if (reset_code) {
        res.sendFile(path.join(__dirname, '../public/passwordreset.html')); // Serve passwordreset.html
    } else {
        res.status(400).send('Invalid or missing reset code');
    }
});

// Serve the 'activate.html' page for account activation
router.get('/activate', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/activate.html'));
});

// Auth API Routes
router.post('/signup', authController.signup); // User registration
router.post('/login', authController.login); // User login
router.post('/request-password-reset', authController.requestPasswordReset); // Request password reset
router.post('/reset-password', authController.resetPassword); // Reset password
router.post('/activate', authController.activateAccount); // Account activation (activation code provided in body)
router.get('/activate/:token', authController.activateAccount); // Account activation via token passed in URL

// Export the Router
module.exports = router;

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
    const csrf_token = req.session.csrf_token;  // Assuming CSRF token is stored in session
    const reset_code = req.query.token;  // The token passed in the URL

    if (reset_code) {
        res.render('recoverpwd', { csrf_token, reset_code });  // Render the page with CSRF token and reset code
    } else {
        res.status(400).send('Invalid or missing reset code');
    }
});

router.get('/activate', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/activate.html'));
});

// Auth API Routes
router.post('/signup', authController.signup); // User registration
router.post('/login', authController.login); // Login
router.post('/request-password-reset', authController.requestPasswordReset); // Request password reset
router.post('/reset-password', authController.resetPassword); // Reset password
router.post('/activate', authController.activateAccount); // Account activation (activation code provided in body)
router.get('/activate/:token', authController.activateAccount); // Account activation via token passed in URL

// Export the Router
module.exports = router;

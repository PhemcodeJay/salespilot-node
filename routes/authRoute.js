const express = require('express');
const router = express.Router();
const authController = require('../controllers/authcontroller');

// Signup route (POST for handling signup)
router.post('/auth/signup', async (req, res) => {
    try {
        // Extract form data
        const { username, password, confirm_password, email, terms } = req.body;

        // Validation checks
        const errorMessages = {};

        if (!username) errorMessages.username_error = 'Username is required.';
        if (!password) errorMessages.password_error = 'Password is required.';
        if (password !== confirm_password) errorMessages.confirm_password_error = 'Passwords do not match.';
        if (!email) errorMessages.email_error = 'Email is required.';
        if (!terms) errorMessages.terms_error = 'You must agree to the terms and conditions.';

        if (Object.keys(errorMessages).length > 0) {
            return res.status(400).json({ error: 'Validation failed', errorMessages });
        }

        // If validation passes, attempt to create user account
        const result = await authController.signup(req, res);
        res.status(200).json({ message: 'Account created successfully', data: result });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Render Signup page route (GET for showing signup form)
router.get('/auth/signup', (req, res) => {
    res.render('auth/signup', {
        error_message: req.flash('signup_err') || '', // Display any error message from flash
        username: req.flash('username') || '',        // Pre-fill username if there's a previous error
        username_error: req.flash('username_err') || '', // Display any error related to username
        password_error: req.flash('password_err') || '', // Display any error related to password
        confirm_password_error: req.flash('confirm_password_err') || '', // Display confirm password error
        email_error: req.flash('email_err') || '', // Display email error
        terms_error: req.flash('terms_err') || ''  // Display terms error
    });
});

// Activate account route
router.post('/auth/activate', authController.activateAccount);

// Login route (POST for handling login submission)
router.post('/auth/login', async (req, res) => {
    try {
        await authController.login(req, res); // Call the login method from controller
    } catch (error) {
        req.flash('login_err', 'Invalid username or password');
        res.redirect('/auth/login');
    }
});

// Render Login page route (GET for showing login form)
router.get('/auth/login', (req, res) => {
    res.render('auth/login', {
        login_err: req.flash('login_err') || '',  // Default to an empty string if not set
        username: req.flash('username') || '',    // Similarly for username
        username_err: req.flash('username_err') || '' // Similarly for username_err
    });
});

// Feedback route (POST for sending feedback)
router.post('/auth/feedback', authController.sendFeedback);

// Render Feedback page route (GET for rendering feedback form)
router.get('/auth/feedback', (req, res) => {
    res.render('auth/feedback', {
        feedback_err: req.flash('feedback_err') || ''  // Default to an empty string if not set
    });
});

// Subscription route (POST for managing subscription)
router.post('/auth/subscription', authController.manageSubscription);

// Render Subscription page route (GET for showing subscription form)
router.get('/auth/subscription', (req, res) => {
    res.render('auth/subscription', {
        subscription_err: req.flash('subscription_err') || ''  // Default to an empty string if not set
    });
});

// Logout route (GET to log out user)
router.get('/auth/logout', (req, res) => {
    res.clearCookie('jwt');  // If you store JWT in cookies
    res.redirect('/auth/login');
});

module.exports = router;

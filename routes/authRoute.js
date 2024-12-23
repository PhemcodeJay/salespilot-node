const express = require('express');
const router = express.Router();
const authcontroller = require('../controllers/authcontroller');

// Signup route
router.post('/auth/signup', authcontroller.signup);

// Activate account route
router.post('/auth/activate', authcontroller.activateAccount);

// Login route (POST for handling login submission)
router.post('/auth/login', authcontroller.login);



// Login route (POST for handling login submission)
router.post('/auth/login', async (req, res) => {
    try {
        const response = await authcontroller.login(req, res);
        // If login is successful, send the token or redirect to dashboard
        res.json(response);
    } catch (error) {
        // Redirect with error message to login page or show flash message
        req.flash('login_err', 'Invalid email or password');
        res.redirect('/login');
    }
});

// Render Login page route (GET for showing login form)
router.get('/login', (req, res) => {
    res.render('auth/login', {
        login_err: req.flash('login_err') || '',  // Default to an empty string if not set
        username: req.flash('username') || '',    // Similarly for username
        username_err: req.flash('username_err') || '' // Similarly for username_err
    });
});

// Feedback route (POST for sending feedback)
router.post('/auth/feedback', authcontroller.sendFeedback);

// Render Feedback page route (GET for rendering feedback form)
router.get('/feedback', (req, res) => {
    res.render('auth/feedback', {
        feedback_err: req.flash('feedback_err') || ''  // Default to an empty string if not set
    });
});

// Subscription route (POST for managing subscription)
router.post('/subscription', authcontroller.manageSubscription);

// Render Subscription page route (GET for showing subscription form)
router.get('/subscription', (req, res) => {
    res.render('auth/subscription', {
        subscription_err: req.flash('subscription_err') || ''  // Default to an empty string if not set
    });
});

// Logout route (GET to log out user)
router.get('/logout', (req, res) => {
    res.clearCookie('jwt');  // If you store JWT in cookies
    res.redirect('/login');
});

module.exports = router;

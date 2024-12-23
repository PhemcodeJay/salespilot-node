const express = require('express');
const { check } = require('express-validator');
const {
    registerUser,
    activateAccount,
    loginUser,
    logoutUser,
    submitFeedback,
    resetPassword
} = require('../controllers/authcontroller'); // Import controller functions

const router = express.Router();

// Serve Views

// Render Login page
router.get('/login', (req, res) => {
    res.render('auth/login', { error: null });
});

// Render Signup page
router.get('/signup', (req, res) => {
    res.render('auth/signup', { error: null, username: '', email: '', success: null });
});

// Render Activation page
router.get('/activate', (req, res) => {
    res.render('auth/activate', { error: null });
});

// Render Password Reset page
router.get('/passwordreset', (req, res) => {
    res.render('auth/passwordreset', { error: null });
});

// Render Password Recovery page
router.get('/recoverpwd', (req, res) => {
    res.render('auth/recoverpwd', { error: null });
});

// Signup Route
router.post(
    '/signup',
    [
        check('username', 'Username is required').notEmpty(),
        check('email', 'Please include a valid email').isEmail(),
        check('password', 'Password must be at least 6 characters long').isLength({ min: 6 }),
        check('confirm_password', 'Please confirm your password').notEmpty()
    ],
    registerUser
);

// Account Activation Route
router.post('/activate', [
    check('activationCode', 'Activation code is required').notEmpty()
], activateAccount);

// Login Route
router.post(
    '/login',
    [
        check('email', 'Please include a valid email').isEmail(),
        check('password', 'Password is required').notEmpty()
    ],
    loginUser
);

// Feedback Route
router.post(
    '/feedback',
    [
        check('username', 'Username is required').notEmpty(),
        check('feedback', 'Feedback is required').notEmpty()
    ],
    submitFeedback
);

// Password Reset Request Route
router.post(
    '/passwordreset',
    [
        check('email', 'Please include a valid email').isEmail()
    ],
    resetPassword
);

// Logout Route
router.post('/logout', logoutUser);

module.exports = router;

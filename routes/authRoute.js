const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const User = require('../models/user');
const { sendPasswordResetEmail, sendAccountActivationEmail } = require('../utils/email');

// Load Views
router.get('/login', (req, res) => {
    res.render('auth/login');
});

router.get('/signup', (req, res) => {
    res.render('auth/signup');
});

router.get('/activate', (req, res) => {
    res.render('auth/activate');
});

router.get('/passwordreset', (req, res) => {
    res.render('auth/passwordreset');
});

router.get('/recoverpwd', (req, res) => {
    res.render('auth/recoverpwd');
});

// Signup Route
router.post('/signup', async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { username, password, email } = req.body;

    try {
        // Check if the user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ msg: 'User already exists' });
        }

        // Hash the password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create the new user
        const newUser = new User({
            username,
            email,
            password: hashedPassword,
            isActive: false, // Account will be inactive until activated
        });

        // Save user
        await newUser.save();

        // Send activation email
        sendAccountActivationEmail(newUser.email, newUser._id);

        res.status(201).json({ msg: 'User registered successfully. Please check your email to activate your account.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Server error' });
    }
});

// Account Activation Route
router.post('/activate', async (req, res) => {
    const { activationCode } = req.body;

    try {
        const user = await User.findOne({ activationCode });
        if (!user) {
            return res.status(400).json({ msg: 'Invalid activation code' });
        }

        // Activate user account
        user.isActive = true;
        await user.save();

        res.status(200).json({ msg: 'Account activated successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Server error' });
    }
});

// Login Route
router.post('/login', async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { username, password } = req.body;

    try {
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(400).json({ msg: 'Invalid credentials' });
        }

        if (!user.isActive) {
            return res.status(400).json({ msg: 'Account is not activated. Please check your email' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ msg: 'Invalid credentials' });
        }

        const payload = { userId: user._id };
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });

        res.json({ token });
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Server error' });
    }
});

// Password Reset Request Route
router.post('/passwordreset', async (req, res) => {
    const { email } = req.body;

    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ msg: 'User not found' });
        }

        const resetToken = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

        sendPasswordResetEmail(user.email, resetToken);

        res.status(200).json({ msg: 'Password reset email sent successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Server error' });
    }
});

// Validate Password Reset Code Route
router.post('/validatepasswordreset', async (req, res) => {
    const { reset_code } = req.body;

    try {
        jwt.verify(reset_code, process.env.JWT_SECRET);
        res.status(200).json({ msg: 'Reset code is valid' });
    } catch (error) {
        console.error(error);
        res.status(400).json({ msg: 'Invalid or expired reset code' });
    }
});

// Reset Password Route
router.post('/resetpassword', async (req, res) => {
    const { user_id, reset_code, new_password } = req.body;

    try {
        const decoded = jwt.verify(reset_code, process.env.JWT_SECRET);
        if (decoded.userId !== user_id) {
            return res.status(400).json({ msg: 'Invalid reset request' });
        }

        const user = await User.findById(user_id);
        if (!user) {
            return res.status(400).json({ msg: 'User not found' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(new_password, salt);

        user.password = hashedPassword;
        await user.save();

        res.status(200).json({ msg: 'Password updated successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Server error' });
    }
});


// Feedback Route
router.get('/feedback', (req, res) => {
    res.render('auth/feedback');  // Render the feedback.ejs form
});

router.post('/submit-feedback', async (req, res) => {
    const { rating, comments } = req.body;

    try {
        // Save feedback to the database or perform any other action you want
        const feedback = new Feedback({
            rating,
            comments,
            submittedAt: new Date()
        });

        await feedback.save();  // Assuming you have a Feedback model set up

        res.status(200).json({ msg: 'Thank you for your feedback!' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Error submitting feedback, please try again later.' });
    }
});

// Export the router
module.exports = router;


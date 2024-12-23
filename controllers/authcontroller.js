require('dotenv').config(); // Load environment variables
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const { validationResult } = require('express-validator');

// Import Models
const User = require('../models/user');
const ActivationCode = require('../models/activation-code');
const PasswordReset = require('../models/passwordreset');
const Subscription = require('../models/subscriptions');
const passport = require('passport');

// Assuming the local strategy is used
exports.loginWithPassport = (req, res, next) => {
    passport.authenticate('local', {
        successRedirect: '/dashboard',
        failureRedirect: '/auth/login',
        failureFlash: true, // This line enables failure flash messages
        successFlash: 'Welcome back!' // Optional success message
    })(req, res, next);
};

// Nodemailer Setup
const transporter = nodemailer.createTransport({
    service: 'ionos', // Update with your email provider
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

// Utility Function: Send Email
const sendEmail = async (to, subject, text) => {
    try {
        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to,
            subject,
            text,
        });
    } catch (error) {
        throw new Error('Failed to send email');
    }
};

// Auth Controller
module.exports = {
    /**
     * User Signup
     */
    signup: async (req, res) => {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ message: 'Username and password are required.' });
        }

        try {
            // Check if user exists using the User model
            const existingUser = await User.findOne({ username });
            if (existingUser) {
                return res.status(400).json({ message: 'Username already in use.' });
            }

            // Hash password and create user
            const hashedPassword = await bcrypt.hash(password, 10);
            const newUser = await User.create({ username, password: hashedPassword });

            // Create activation code using the ActivationCode model
            const activationCode = Math.random().toString(36).substring(2, 8).toUpperCase();
            const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

            await ActivationCode.create({
                userId: newUser.id,
                activationCode,
                expiresAt,
            });

            // Add trial subscription using the Subscription model
            const trialExpiry = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000); // 90 days trial
            await Subscription.create({
                userId: newUser.id,
                type: 'trial',
                expiresAt: trialExpiry,
            });

            // Send activation email
            const emailText = `Welcome! Activate your account using this code: ${activationCode}`;
            await sendEmail(newUser.username, 'Activate Your Account', emailText);

            res.status(201).json({
                message: 'Signup successful! Please check your email for the activation code.',
            });
        } catch (error) {
            res.status(500).json({ message: 'Server error.', error: error.message });
        }
    },

    /**
     * Activate User Account
     */
    activateAccount: async (req, res) => {
        const { activationCode } = req.body;

        if (!activationCode) {
            return res.status(400).json({ message: 'Activation code is required.' });
        }

        try {
            // Find the activation code using the ActivationCode model
            const codeRecord = await ActivationCode.findOne({ activationCode });

            if (!codeRecord) {
                return res.status(400).json({ message: 'Invalid or expired activation code.' });
            }

            if (new Date(codeRecord.expiresAt) < new Date()) {
                return res.status(400).json({ message: 'Activation code has expired.' });
            }

            // Find the user
            const user = await User.findById(codeRecord.userId);
            if (!user) {
                return res.status(404).json({ message: 'User not found.' });
            }

            // Activate the user account
            await User.updateOne({ id: user.id }, { isActive: true });

            // Delete used activation code
            await ActivationCode.deleteOne({ id: codeRecord.id });

            res.status(200).json({ message: 'Account activated successfully!' });
        } catch (error) {
            res.status(500).json({ message: 'Server error.', error: error.message });
        }
    },

    /**
     * User Login
     */
    login: async (req, res) => {
        const { username, password } = req.body;
        let password_err = '';

        if (!username || !password) {
            password_err = 'Username and password are required.';
            return res.render('auth/login', { password_err, username: username || '' });
        }

        try {
            const user = await User.findOne({ username });
            if (!user || !(await bcrypt.compare(password, user.password))) {
                password_err = 'Invalid username or password.';
                return res.render('auth/login', { password_err, username });
            }

            if (!user.isActive) {
                password_err = 'Account is not activated.';
                return res.render('auth/login', { password_err, username });
            }

            const token = jwt.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET, {
                expiresIn: '1h',
            });

            // Store the token in a cookie or session if necessary for client-side authentication
            res.cookie('auth_token', token, { httpOnly: true, maxAge: 3600000 }); // Example of setting a cookie

            res.redirect('/dashboard'); // Redirect to the dashboard or another page after successful login
        } catch (error) {
            password_err = 'Server error occurred. Please try again.';
            return res.render('auth/login', { password_err, username: username || '' });
        }
    },

    /**
     * Send Feedback
     */
    sendFeedback: async (req, res) => {
        const { username, feedback } = req.body;

        if (!username || !feedback) {
            return res.status(400).json({ message: 'Username and feedback are required.' });
        }

        try {
            await sendEmail(process.env.FEEDBACK_EMAIL, `Feedback from ${username}`, feedback);
            res.status(200).json({ message: 'Feedback sent successfully!' });
        } catch (error) {
            res.status(500).json({ message: 'Failed to send feedback.', error: error.message });
        }
    },

    /**
     * Manage Subscriptions
     */
    manageSubscription: async (req, res) => {
        const { userId, subscriptionType } = req.body;

        if (!userId || !subscriptionType) {
            return res.status(400).json({ message: 'User ID and subscription type are required.' });
        }

        try {
            const user = await User.findById(userId);
            if (!user) {
                return res.status(404).json({ message: 'User not found.' });
            }

            let subscription = await Subscription.findOne({ userId });

            const newExpiry = new Date(
                Date.now() + (subscriptionType === 'trial' ? 90 : 365) * 24 * 60 * 60 * 1000
            );

            if (subscription) {
                subscription.type = subscriptionType;
                subscription.expiresAt = newExpiry;
                await subscription.save();
            } else {
                await Subscription.create({
                    userId,
                    type: subscriptionType,
                    expiresAt: newExpiry,
                });
            }

            res.status(200).json({ message: 'Subscription updated successfully!' });
        } catch (error) {
            res.status(500).json({ message: 'Server error.', error: error.message });
        }
    },

    /**
     * User Logout
     */
    logout: async (req, res) => {
        // Invalidate the token on the client side by instructing the client to remove it
        res.status(200).json({ message: 'Logged out successfully!' });
    }
};

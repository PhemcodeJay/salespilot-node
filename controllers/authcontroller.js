require('dotenv').config(); // Load environment variables
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const mysql = require('mysql2/promise');
const { validationResult } = require('express-validator');

// Models (assumed available as per your draft)
const ActivationCode = require('../models/activation-code');
const PasswordReset = require('../models/passwordreset');
const User = require('../models/user');
const Subscription = require('../models/subscriptions');

// Database connection pool
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Nodemailer setup
const transporter = nodemailer.createTransport({
    service: 'gmail', // Replace with your email provider
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Function to send an email
const sendEmail = async (email, subject, text) => {
    await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: email,
        subject,
        text
    });
};

// Controller
module.exports = {
    // Signup
    signup: async (req, res) => {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required.' });
        }

        try {
            const existingUser = await User.getUserByEmail(email);
            if (existingUser) {
                return res.status(400).json({ message: 'Email is already in use.' });
            }

            const hashedPassword = await bcrypt.hash(password, 10);
            const newUser = await User.createUser({ email, password: hashedPassword });

            const activationCode = Math.random().toString(36).substring(2, 8).toUpperCase();
            const expiresAt = new Date(Date.now() + 86400 * 1000);

            await ActivationCode.createActivationCode({
                user_id: newUser.id,
                activation_code: activationCode,
                expires_at: expiresAt
            });

            const trialExpiry = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000); // 90 days
            await Subscription.createSubscription({
                user_id: newUser.id,
                type: 'trial',
                expires_at: trialExpiry
            });

            const emailText = `Activate your account with code: ${activationCode}`;
            await sendEmail(email, 'Account Activation', emailText);

            res.status(201).json({
                message: 'Signup successful. Check your email for the activation code.'
            });
        } catch (error) {
            res.status(500).json({ message: 'Server error.', error: error.message });
        }
    },

    // Login
    login: async (req, res) => {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required.' });
        }

        try {
            const user = await User.getUserByEmail(email);
            if (!user) {
                return res.status(401).json({ message: 'Invalid email or password.' });
            }

            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                return res.status(401).json({ message: 'Invalid email or password.' });
            }

            if (!user.is_active) {
                return res.status(403).json({ message: 'Account is not activated.' });
            }

            const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '1h' });
            res.json({ message: 'Login successful.', token });
        } catch (error) {
            res.status(500).json({ message: 'Server error.', error: error.message });
        }
    },

    // Logout
    logout: (req, res) => {
        try {
            // Client-side token removal
            res.json({ message: 'Logout successful.' });
        } catch (error) {
            res.status(500).json({ message: 'Server error during logout.', error: error.message });
        }
    },

    // Send Feedback Email
    sendFeedback: async (req, res) => {
        const { email, feedback } = req.body;

        if (!email || !feedback) {
            return res.status(400).json({ message: 'Email and feedback are required.' });
        }

        try {
            const feedbackSubject = `Feedback from ${email}`;
            await sendEmail(process.env.FEEDBACK_EMAIL, feedbackSubject, feedback);
            res.json({ message: 'Feedback submitted successfully.' });
        } catch (error) {
            res.status(500).json({ message: 'Failed to send feedback.', error: error.message });
        }
    }
};

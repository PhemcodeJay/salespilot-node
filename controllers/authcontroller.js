require('dotenv').config(); // Load environment variables
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const { validationResult } = require('express-validator');

// Import Models
const auth = require('../models/user'); // Assuming you have a User model
const ActivationCode = require('../models/activation-code');
const PasswordReset = require('../models/passwordreset');
const Subscription = require('../models/subscriptions');

// Database Connection
const mysql = require('mysql2/promise');
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

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
    await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to,
        subject,
        text,
    });
};

// Auth Controller
module.exports = {
    /**
     * User Signup
     */
    signup: async (req, res) => {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required.' });
        }

        try {
            // Check if user exists
            const [existingUser] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
            if (existingUser.length > 0) {
                return res.status(400).json({ message: 'Email already in use.' });
            }

            // Hash password and create user
            const hashedPassword = await bcrypt.hash(password, 10);
            const [newUser] = await pool.query('INSERT INTO users (email, password) VALUES (?, ?)', [email, hashedPassword]);

            // Create activation code
            const activationCode = Math.random().toString(36).substring(2, 8).toUpperCase();
            const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

            await pool.query('INSERT INTO activation_codes (user_id, activation_code, expires_at) VALUES (?, ?, ?)', [
                newUser.insertId,
                activationCode,
                expiresAt,
            ]);

            // Add trial subscription
            const trialExpiry = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000); // 90 days trial
            await pool.query('INSERT INTO subscriptions (user_id, type, expires_at) VALUES (?, ?, ?)', [
                newUser.insertId,
                'trial',
                trialExpiry,
            ]);

            // Send activation email
            const emailText = `Welcome! Activate your account using this code: ${activationCode}`;
            await sendEmail(email, 'Activate Your Account', emailText);

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
            const [codeRecord] = await pool.query('SELECT * FROM activation_codes WHERE activation_code = ?', [activationCode]);

            if (codeRecord.length === 0) {
                return res.status(400).json({ message: 'Invalid or expired activation code.' });
            }

            if (new Date(codeRecord[0].expires_at) < new Date()) {
                return res.status(400).json({ message: 'Activation code has expired.' });
            }

            const [user] = await pool.query('SELECT * FROM users WHERE id = ?', [codeRecord[0].user_id]);
            if (user.length === 0) {
                return res.status(404).json({ message: 'User not found.' });
            }

            await pool.query('UPDATE users SET is_active = true WHERE id = ?', [user[0].id]);

            // Delete used activation code
            await pool.query('DELETE FROM activation_codes WHERE id = ?', [codeRecord[0].id]);

            res.status(200).json({ message: 'Account activated successfully!' });
        } catch (error) {
            res.status(500).json({ message: 'Server error.', error: error.message });
        }
    },

    /**
     * User Login
     */
    login: async (req, res) => {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required.' });
        }

        try {
            const [user] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
            if (user.length === 0 || !(await bcrypt.compare(password, user[0].password))) {
                return res.status(401).json({ message: 'Invalid email or password.' });
            }

            if (!user[0].is_active) {
                return res.status(403).json({ message: 'Account is not activated.' });
            }

            const token = jwt.sign({ id: user[0].id, email: user[0].email }, process.env.JWT_SECRET, {
                expiresIn: '1h',
            });

            res.status(200).json({ message: 'Login successful!', token });
        } catch (error) {
            res.status(500).json({ message: 'Server error.', error: error.message });
        }
    },

    /**
     * Send Feedback
     */
    sendFeedback: async (req, res) => {
        const { email, feedback } = req.body;

        if (!email || !feedback) {
            return res.status(400).json({ message: 'Email and feedback are required.' });
        }

        try {
            await sendEmail(process.env.FEEDBACK_EMAIL, `Feedback from ${email}`, feedback);
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
            const [user] = await pool.query('SELECT * FROM users WHERE id = ?', [userId]);
            if (user.length === 0) {
                return res.status(404).json({ message: 'User not found.' });
            }

            let [subscription] = await pool.query('SELECT * FROM subscriptions WHERE user_id = ?', [userId]);

            const newExpiry = new Date(
                Date.now() + (subscriptionType === 'trial' ? 90 : 365) * 24 * 60 * 60 * 1000
            );

            if (subscription.length > 0) {
                await pool.query('UPDATE subscriptions SET type = ?, expires_at = ? WHERE user_id = ?', [
                    subscriptionType,
                    newExpiry,
                    userId,
                ]);
            } else {
                await pool.query('INSERT INTO subscriptions (user_id, type, expires_at) VALUES (?, ?, ?)', [
                    userId,
                    subscriptionType,
                    newExpiry,
                ]);
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
        // Since JWT is stateless and stored on the client-side, we cannot "delete" a token from the server
        // But we can advise the client to delete it from the local storage/cookie.

        res.status(200).json({ message: 'Logged out successfully!' });
    }
};

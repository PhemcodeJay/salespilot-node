require('dotenv').config(); // Load environment variables from .env file

const express = require('express');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const mysql = require('mysql2');

// Create Express app
const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// MySQL connection setup
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
});

// Nodemailer setup
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT || 587, // Default to port 587
    secure: false, // Set to true if using port 465
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

// Utility function to send emails
const sendEmail = (to, subject, text, html) => {
    return transporter.sendMail({
        from: process.env.SMTP_USER,
        to,
        subject,
        text,
        html,
    });
};

// User Registration Route
app.post('/signup', async (req, res) => {
    const { username, password, email, confirmpassword } = req.body;

    if (!username || !password || !email || !confirmpassword) {
        return res.status(400).json({ error: 'All fields are required!' });
    }
    if (password.length < 5 || password.length > 20) {
        return res.status(400).json({ error: 'Password must be between 5 and 20 characters!' });
    }
    if (password !== confirmpassword) {
        return res.status(400).json({ error: 'Passwords do not match!' });
    }
    if (!/^[a-zA-Z0-9]+$/.test(username)) {
        return res.status(400).json({ error: 'Username can only contain letters and numbers!' });
    }
    if (!/^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/.test(email)) {
        return res.status(400).json({ error: 'Invalid email format!' });
    }

    try {
        // Check if the user exists
        const [existingUser] = await db.promise().execute(
            'SELECT id FROM users WHERE username = ? OR email = ?',
            [username, email]
        );

        if (existingUser.length > 0) {
            return res.status(400).json({ error: 'Username or Email already exists!' });
        }

        // Hash the password and generate activation code
        const hashedPassword = await bcrypt.hash(password, 10);
        const activationCode = crypto.randomBytes(16).toString('hex');
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 1 day from now

        // Insert user into the database
        const [insertUserResult] = await db.promise().execute(
            'INSERT INTO users (username, password, email) VALUES (?, ?, ?)',
            [username, hashedPassword, email]
        );
        const userId = insertUserResult.insertId;

        // Insert activation code into the database
        await db.promise().execute(
            'INSERT INTO activation_codes (user_id, activation_code, expires_at) VALUES (?, ?, ?)',
            [userId, activationCode, expiresAt]
        );

        // Send activation email
        const activationLink = `https://salespilot.cybertrendhub.store/activate.php?token=${activationCode}`;
        await sendEmail(email, 'Activate Your Account', `Click here to activate your account: ${activationLink}`, 
            `<a href="${activationLink}">Activate Account</a>`);

        res.json({ message: 'Registration successful! Please check your email to activate your account.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error. Please try again later.' });
    }
});

// Login Handler
app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and Password are required!' });
    }

    try {
        // Fetch user details from database
        const [users] = await db.promise().execute(
            'SELECT id, username, password FROM users WHERE username = ?',
            [username]
        );

        if (users.length === 0) {
            return res.status(400).json({ error: 'Invalid username or password!' });
        }

        const user = users[0];

        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(400).json({ error: 'Invalid username or password!' });
        }

        // Generate JWT token
        const token = jwt.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET, { expiresIn: '1d' });

        res.json({ message: 'Login successful!', token });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error. Please try again later.' });
    }
});

// Password Reset Request
app.post('/password-reset', (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).send('Email is required');
    }

    const query = 'SELECT id FROM users WHERE email = ?';
    db.execute(query, [email], (err, results) => {
        if (err || results.length === 0) {
            return res.status(404).send('Email not found');
        }

        const userId = results[0].id;
        const resetToken = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 1);

        const resetQuery = 'INSERT INTO password_resets (user_id, reset_code, expires_at) VALUES (?, ?, ?)';
        db.execute(resetQuery, [userId, resetToken, expiresAt], (err) => {
            if (err) {
                return res.status(500).send('Error creating password reset token');
            }

            const resetUrl = `https://yourdomain.com/reset-password?token=${resetToken}`;
            sendEmail(email, 'Password Reset Request', `Click here to reset your password: ${resetUrl}`, 
                `<a href="${resetUrl}">Reset Password</a>`)
                .then(() => {
                    res.send('Password reset email sent');
                })
                .catch(err => {
                    res.status(500).send(`Error sending email: ${err.message}`);
                });
        });
    });
});

// Reset Password Handler
app.post('/reset-password', (req, res) => {
    const { password, confirmPassword, token } = req.body;

    if (!password || !confirmPassword || password !== confirmPassword || password.length < 5 || password.length > 20) {
        return res.status(400).send('Invalid input');
    }

    const query = 'SELECT user_id, expires_at FROM password_resets WHERE reset_code = ?';
    db.execute(query, [token], (err, results) => {
        if (err || results.length === 0) {
            return res.status(400).send('Invalid or expired reset token');
        }

        const resetData = results[0];
        if (new Date() > new Date(resetData.expires_at)) {
            return res.status(400).send('Reset token has expired');
        }

        const hashedPassword = bcrypt.hashSync(password, 10);

        const updatePasswordQuery = 'UPDATE users SET password = ? WHERE id = ?';
        db.execute(updatePasswordQuery, [hashedPassword, resetData.user_id], (err) => {
            if (err) {
                return res.status(500).send('Error updating password');
            }

            const deleteTokenQuery = 'DELETE FROM password_resets WHERE reset_code = ?';
            db.execute(deleteTokenQuery, [token], (err) => {
                if (err) {
                    return res.status(500).send('Error removing reset token');
                }

                res.send('Password reset successful');
            });
        });
    });
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
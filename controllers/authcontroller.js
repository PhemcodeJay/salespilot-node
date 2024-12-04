const bcrypt = require('bcrypt');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const mysql = require('mysql2');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

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
    port: process.env.SMTP_PORT || 587,
    secure: false,
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

// Controller functions

// User Registration
const signup = async (req, res) => {
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
        const [existingUser] = await db.promise().execute(
            'SELECT id FROM users WHERE username = ? OR email = ?',
            [username, email]
        );

        if (existingUser.length > 0) {
            return res.status(400).json({ error: 'Username or Email already exists!' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const activationCode = crypto.randomBytes(16).toString('hex');
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 1 day from now

        const [insertUserResult] = await db.promise().execute(
            'INSERT INTO users (username, password, email) VALUES (?, ?, ?)',
            [username, hashedPassword, email]
        );
        const userId = insertUserResult.insertId;

        await db.promise().execute(
            'INSERT INTO activation_codes (user_id, activation_code, expires_at) VALUES (?, ?, ?)',
            [userId, activationCode, expiresAt]
        );

        const activationLink = `https://salespilot.cybertrendhub.store/activate?token=${activationCode}`;
        await sendEmail(email, 'Activate Your Account', `Click here to activate your account: ${activationLink}`, 
            `<a href="${activationLink}">Activate Account</a>`);

        res.json({ message: 'Registration successful! Please check your email to activate your account.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error. Please try again later.' });
    }
};

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../models'); // Assuming you're using Sequelize or similar ORM

const signup = async (req, res) => {
  const { username, password, email } = req.body;

  if (!username || !password || !email) {
    return res.status(400).json({ error: 'Username, password, and email are required.' });
  }

  try {
    // Check if username or email already exists
    const existingUser = await db.User.findOne({
      where: { [db.Sequelize.Op.or]: [{ username }, { email }] }
    });

    if (existingUser) {
      return res.status(400).json({ error: 'Username or email already taken.' });
    }

    // Hash password before saving
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await db.User.create({
      username,
      password: hashedPassword,
      email
    });

    // Optionally, generate a JWT token
    const token = jwt.sign({ userId: newUser.id }, process.env.JWT_SECRET, { expiresIn: '1h' });

    return res.status(201).json({ message: 'User created successfully', token });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'An error occurred. Please try again.' });
  }
};

module.exports = { signup };


// User Login
const login = async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and Password are required!' });
    }

    try {
        const [users] = await db.promise().execute(
            'SELECT id, username, password FROM users WHERE username = ?',
            [username]
        );

        if (users.length === 0) {
            return res.status(400).json({ error: 'Invalid username or password!' });
        }

        const user = users[0];
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(400).json({ error: 'Invalid username or password!' });
        }

        const token = jwt.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET, { expiresIn: '1d' });

        res.json({ message: 'Login successful!', token });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error. Please try again later.' });
    }
};

// Password Reset Request
const passwordReset = async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).send('Email is required');
    }

    try {
        const query = 'SELECT id FROM users WHERE email = ?';
        const [results] = await db.promise().execute(query, [email]);

        if (results.length === 0) {
            return res.status(404).send('Email not found');
        }

        const userId = results[0].id;
        const resetToken = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 1);

        const resetQuery = 'INSERT INTO password_resets (user_id, reset_code, expires_at) VALUES (?, ?, ?)';
        await db.promise().execute(resetQuery, [userId, resetToken, expiresAt]);

        const resetUrl = `https://yourdomain.com/reset-password?token=${resetToken}`;
        await sendEmail(email, 'Password Reset Request', `Click here to reset your password: ${resetUrl}`, 
            `<a href="${resetUrl}">Reset Password</a>`);

        res.send('Password reset email sent');
    } catch (error) {
        console.error(error);
        res.status(500).send('Error creating password reset token');
    }
};

// Reset Password
const resetPassword = async (req, res) => {
    const { password, confirmPassword, token } = req.body;

    if (!password || !confirmPassword || password !== confirmPassword || password.length < 5 || password.length > 20) {
        return res.status(400).send('Invalid input');
    }

    try {
        const query = 'SELECT user_id, expires_at FROM password_resets WHERE reset_code = ?';
        const [results] = await db.promise().execute(query, [token]);

        if (results.length === 0) {
            return res.status(400).send('Invalid or expired reset token');
        }

        const resetData = results[0];
        if (new Date() > new Date(resetData.expires_at)) {
            return res.status(400).send('Reset token has expired');
        }

        const hashedPassword = bcrypt.hashSync(password, 10);

        const updatePasswordQuery = 'UPDATE users SET password = ? WHERE id = ?';
        await db.promise().execute(updatePasswordQuery, [hashedPassword, resetData.user_id]);

        const deleteTokenQuery = 'DELETE FROM password_resets WHERE reset_code = ?';
        await db.promise().execute(deleteTokenQuery, [token]);

        res.send('Password reset successful');
    } catch (error) {
        console.error(error);
        res.status(500).send('Error resetting password');
    }
};

module.exports = { signup, login, passwordReset, resetPassword };

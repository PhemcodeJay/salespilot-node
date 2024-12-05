const express = require('express');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const { getConnection } = require('./db.js');

const router = express.Router();

// Environment variables (replace with your own)
const EMAIL_HOST = 'smtp.ionos.com';
const EMAIL_USER = 'admin@cybertrendhub.store';
const EMAIL_PASS = 'kokochulo@1987#';
const EMAIL_FROM = 'admin@cybertrendhub.store';
const EMAIL_NAME = 'SalesPilot';
const JWT_SECRET = 'your_jwt_secret'; // Replace with a strong secret

// Registration Handler
router.post('/signup', async (req, res) => {
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
        const connection = await getConnection();

        // Check if the user exists
        const [existingUser] = await connection.execute(
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

        // Insert the user and activation code
        await connection.execute(
            'INSERT INTO users (username, password, email) VALUES (?, ?, ?)',
            [username, hashedPassword, email]
        );
        const [result] = await connection.query('SELECT LAST_INSERT_ID() AS userId');
        const userId = result[0].userId;

        await connection.execute(
            'INSERT INTO activation_codes (user_id, activation_code, expires_at) VALUES (?, ?, ?)',
            [userId, activationCode, expiresAt]
        );

        // Send activation email
        const transporter = nodemailer.createTransport({
            host: EMAIL_HOST,
            port: 587,
            auth: {
                user: EMAIL_USER,
                pass: EMAIL_PASS,
            },
        });

        const activationLink = `https://salespilot.cybertrendhub.store/activate.php?token=${activationCode}`;
        await transporter.sendMail({
            from: `${EMAIL_NAME} <${EMAIL_FROM}>`,
            to: email,
            subject: 'Activate Your Account',
            html: `<p>Hello,<br>Click the link below to activate your account:<br><a href="${activationLink}">Activate Account</a></p>`,
        });

        res.json({ message: 'Registration successful! Please check your email to activate your account.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error. Please try again later.' });
    }
});

// Login Handler
router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and Password are required!' });
    }

    try {
        const connection = await getConnection();

        // Fetch user details
        const [users] = await connection.execute(
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

        // Generate session and token
        const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '1d' });

        req.session.loggedin = true;
        req.session.id_user = user.id;
        req.session.username = user.username;

        res.json({ message: 'Login successful!', token });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error. Please try again later.' });
    }
});

module.exports = router;

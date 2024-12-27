const User = require('../models/authModel'); // Ensure this matches your authModel export
const profile = require('../models/profile');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');

// Sign up a new user
exports.signup = async (req, res) => {
  const { username, email, password, confirm_password } = req.body;

  if (password !== confirm_password) {
    return res.status(400).send('Passwords do not match');
  }

  try {
    const user = await User.findUserByEmail(email);
    if (user) {
      return res.status(400).send('Email already in use');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await User.createUser({ username, email, password: hashedPassword });

    const token = jwt.sign({ userId: result.insertId }, process.env.JWT_SECRET, { expiresIn: '1h' });

    const transporter = nodemailer.createTransport({
      service: 'ionos',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Account Activation',
      text: `Click the link to activate your account: ${process.env.BASE_URL}/activate/${token}`,
    };

    await transporter.sendMail(mailOptions);

    res.status(201).send('Signup successful. Please check your email for account activation.');
  } catch (err) {
    console.error('Signup error:', err.message);
    res.status(500).send('Error: ' + err.message);
  }
};

// Log in a user
exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findUserByEmail(email);
    if (!user) {
      return res.status(400).send('Invalid credentials');
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).send('Invalid credentials');
    }

    if (!user.isVerified) {
      return res.status(400).send('Please verify your email');
    }

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({ token });
  } catch (err) {
    res.status(500).send('Error: ' + err.message);
  }
};

// Verify user's email after registration
exports.verifyEmail = async (req, res) => {
  const { token } = req.params;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    await User.verifyUser(decoded.userId);

    res.send('Email verified successfully. You can now log in.');
  } catch (err) {
    res.status(400).send('Invalid or expired token');
  }
};

// Reset password functionality
exports.recoverpwd = async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findUserByEmail(email);
    if (!user) {
      return res.status(400).send('Email not found');
    }

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });

    const transporter = nodemailer.createTransport({
      service: 'ionos',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Password Reset Request',
      text: `Click on the link to reset your password: ${process.env.BASE_URL}/reset-password/${token}`,
    };

    await transporter.sendMail(mailOptions);
    res.status(200).send('Password reset email sent. Please check your inbox.');
  } catch (err) {
    res.status(500).send('Error: ' + err.message);
  }
};

// Reset password action
exports.passwordreset = async (req, res) => {
  const { token, newPassword } = req.body;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await User.updatePassword(decoded.userId, hashedPassword);

    res.send('Password successfully reset');
  } catch (err) {
    res.status(400).send('Invalid or expired token');
  }
};

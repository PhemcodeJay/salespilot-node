const express = require('express');
const path = require('path');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const ActivationCode = require('../models/activation-code');
const PasswordReset = require('../models/passwordreset');
const Subscription = require('../models/subscriptions');
const User = require('../models/user'); // Assuming you have a user model
const { sendEmail } = require('../utils/email'); // Assuming you have a utility for sending emails

// Serve static HTML pages (e.g., login, signup, dashboard)
router.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public', 'index.html'));
});

router.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, '../public', 'login.html'));
});

router.get('/signup', (req, res) => {
  res.sendFile(path.join(__dirname, '../public', 'signup.html'));
});

router.get('/reset-password', (req, res) => {
  res.sendFile(path.join(__dirname, '../public', 'reset-password.html'));
});

router.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, '../public', 'dashboard.html'));
});

// POST: Sign Up
router.post('/signup', async (req, res) => {
  const { email, password, name } = req.body;

  try {
    // Check if user already exists
    const existingUser = await User.getByEmail(email);
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user record
    const user = await User.create({ email, password: hashedPassword, name });

    // Create free trial subscription
    await Subscription.createFreeTrial(user.id);

    // Generate activation code
    const activationCode = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24 hours expiration

    await ActivationCode.createActivationCodeRecord({
      user_id: user.id,
      activation_code: activationCode,
      expires_at: expiresAt,
      created_at: new Date(),
    });

    // Send activation email
    const activationLink = `${process.env.FRONTEND_URL}/activate?code=${activationCode}`;
    const emailSent = await sendEmail(
      email,
      'Activate your account',
      `Please use the following code to activate your account: ${activationCode}. Or click the following link: ${activationLink}`
    );

    if (!emailSent) {
      return res.status(500).json({ message: 'Error sending activation email.' });
    }

    res.status(201).json({ message: 'Signup successful. Please check your email to activate your account.' });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST: Activate Account
router.post('/activate', async (req, res) => {
  const { activationCode, email } = req.body;

  try {
    // Verify activation code
    const activationRecord = await ActivationCode.validateActivationCode(activationCode);

    // Update user account status to 'activated' or any other field
    const user = await User.getById(activationRecord.user_id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    await User.updateStatus(user.id, 'activated'); // Assuming an updateStatus method exists

    res.status(200).json({ message: 'Account activated successfully!' });

  } catch (error) {
    console.error(error);
    res.status(400).json({ message: error.message });
  }
});

// POST: Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    // Check if user exists
    const user = await User.getByEmail(email);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign({ userId: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '1h' });

    res.status(200).json({ message: 'Login successful', token });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST: Logout
router.post('/logout', (req, res) => {
  // Just clear the token on the client side (no server-side action needed)
  res.status(200).json({ message: 'Logged out successfully' });
});

// POST: Reset Password Request
router.post('/password-reset-request', async (req, res) => {
  const { email } = req.body;

  try {
    // Check if user exists
    const user = await User.getByEmail(email);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Generate password reset code
    const resetCode = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // 1 hour expiration

    await PasswordReset.createPasswordResetRecord({
      user_id: user.id,
      reset_code: resetCode,
      expires_at: expiresAt,
      created_at: new Date(),
    });

    // Send reset link via email
    const resetLink = `${process.env.FRONTEND_URL}/reset-password?code=${resetCode}`;
    const emailSent = await sendEmail(
      email,
      'Password Reset Request',
      `To reset your password, use the following code: ${resetCode}. Or click the following link: ${resetLink}`
    );

    if (!emailSent) {
      return res.status(500).json({ message: 'Error sending reset password email.' });
    }

    res.status(200).json({ message: 'Password reset email sent successfully.' });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST: Reset Password
router.post('/reset-password', async (req, res) => {
  const { resetCode, newPassword } = req.body;

  try {
    // Validate reset code
    const resetRecord = await PasswordReset.getPasswordResetByCode(resetCode);

    // Check if the reset code is expired
    if (new Date() > new Date(resetRecord.expires_at)) {
      return res.status(400).json({ message: 'Reset code has expired' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update user password
    await User.updatePassword(resetRecord.user_id, hashedPassword);

    res.status(200).json({ message: 'Password reset successfully' });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

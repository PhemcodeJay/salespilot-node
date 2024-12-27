const User = require('../models/authModel');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');

// Sign up a new user
exports.signup = async (req, res) => {
  const { username, email, password, confirm_password } = req.body;

  // Check if passwords match
  if (password !== confirm_password) {
    return res.status(400).send('Passwords do not match');
  }

  try {
    // Check if the user already exists
    const user = await User.findUserByEmail(email);
    if (user) {
      return res.status(400).send('Email already in use');
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create a new user in the database
    const result = await User.createUser({ username, email, password: hashedPassword });

    // Generate a JWT token for email verification
    const token = jwt.sign({ userId: result.insertId }, process.env.JWT_SECRET, { expiresIn: '1h' });

    // Set up email transporter
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

    // Send activation email
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
    // Find the user by email
    const user = await User.findUserByEmail(email);
    if (!user) {
      return res.status(400).send('Invalid credentials');
    }

    // Check if password matches
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).send('Invalid credentials');
    }

    // Check if the user is verified
    if (!user.isVerified) {
      return res.status(400).send('Please verify your email');
    }

    // Generate JWT token
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

    // Update user status to verified
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
    // Find user by email
    const user = await User.findUserByEmail(email);
    if (!user) {
      return res.status(400).send('Email not found');
    }

    // Generate reset password token
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });

    // Set up email transporter
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

    // Send reset password email
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

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update the user's password
    await User.updatePassword(decoded.userId, hashedPassword);

    res.send('Password successfully reset');
  } catch (err) {
    res.status(400).send('Invalid or expired token');
  }
};

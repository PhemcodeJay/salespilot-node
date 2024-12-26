const user = require('../models/authModel');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');

// Sign up a new user
exports.signup = async (req, res) => {
  const { username, email, password } = req.body;

  // Check if user already exists
  user.findUserByEmail(email, async (err, user) => {
    if (err) {
      return res.status(500).send('Error checking user: ' + err.message);
    }

    if (user) {
      return res.status(400).send('Email already in use');
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create a new user in the database
    user.createUser({ username, email, password: hashedPassword }, (err, result) => {
      if (err) {
        return res.status(500).send('Error creating user: ' + err.message);
      }

      // Generate JWT token for email verification
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
        text: `Click on the link to activate your account: ${process.env.BASE_URL}/activate/${token}`,
      };

      // Send activation email
      transporter.sendMail(mailOptions, (err, info) => {
        if (err) {
          return res.status(500).send('Error sending activation email: ' + err.message);
        }
        res.status(201).send('Signup successful. Please check your email for account activation.');
      });
    });
  });
};

// Log in a user
exports.login = async (req, res) => {
  const { email, password } = req.body;

  // Find the user by email
  User.findUserByEmail(email, async (err, user) => {
    if (err) {
      return res.status(500).send('Error: ' + err.message);
    }

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
  });
};

// Verify user's email after registration
exports.verifyEmail = (req, res) => {
  const { token } = req.params;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Update user status to verified
    const query = 'UPDATE users SET isVerified = true WHERE id = ?';
    connection.query(query, [decoded.userId], (err, result) => {
      if (err) {
        return res.status(500).send('Error verifying email: ' + err.message);
      }

      res.send('Email verified successfully. You can now log in.');
    });
  } catch (err) {
    res.status(400).send('Invalid or expired token');
  }
};

// Reset password functionality
exports.recoverpwd = (req, res) => {
  const { email } = req.body;

  // Find user by email
  user.findUserByEmail(email, (err, user) => {
    if (err) {
      return res.status(500).send('Error: ' + err.message);
    }

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
    transporter.sendMail(mailOptions, (err, info) => {
      if (err) {
        return res.status(500).send('Error sending reset password email: ' + err.message);
      }
      res.status(200).send('Password reset email sent. Please check your inbox.');
    });
  });
};

// Reset password action
exports.passwordreset = (req, res) => {
  const { token, newPassword } = req.body;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Hash the new password
    bcrypt.hash(newPassword, 10, (err, hashedPassword) => {
      if (err) {
        return res.status(500).send('Error hashing password');
      }

      // Update the user's password
      const query = 'UPDATE users SET password = ? WHERE id = ?';
      connection.query(query, [hashedPassword, decoded.userId], (err, result) => {
        if (err) {
          return res.status(500).send('Error updating password: ' + err.message);
        }

        res.send('Password successfully reset');
      });
    });
  } catch (err) {
    res.status(400).send('Invalid or expired token');
  }
};

const authModel = require('./authModel');
const express = require('express');
const router = express.Router();

// Signup route
router.post('/signup', async (req, res) => {
  try {
    const userData = req.body; // Get user data from request body
    const newUser = await authModel.signup(userData);
    res.status(201).json({ message: 'User registered successfully. Please check your email to activate your account.', user: newUser });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Email activation route
router.get('/activate', async (req, res) => {
  try {
    const activationCode = req.query.code; // Get activation code from query parameters
    const activatedUser = await authModel.activateUser(activationCode);
    res.status(200).json({ message: 'User activated successfully', user: activatedUser });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Login route
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await authModel.login(email, password);
    req.session.userId = user.id; // Set user session (or use JWT if preferred)
    res.status(200).json({ message: 'Login successful', user });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Logout route
router.post('/logout', (req, res) => {
  req.session.destroy((err) => { // Destroy session on logout
    if (err) {
      return res.status(500).json({ error: 'Failed to log out' });
    }
    res.clearCookie('auth_token');
    res.status(200).json({ message: 'Logout successful' });
  });
});

// Password reset request route
router.post('/password-reset', async (req, res) => {
  try {
    const { email } = req.body;
    await authModel.requestPasswordReset(email);
    res.status(200).json({ message: 'Password reset link sent to your email' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Password reset route
router.post('/reset-password', async (req, res) => {
  try {
    const { resetCode, newPassword } = req.body;
    const updatedUser = await authModel.resetPassword(resetCode, newPassword);
    res.status(200).json({ message: 'Password updated successfully', user: updatedUser });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;

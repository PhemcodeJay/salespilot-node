const express = require('express');
const { signup, login, verifyEmail, recoverpwd, passwordreset } = require('../controllers/authcontroller');
const router = express.Router();

// Render the signup page
router.get('/signup', (req, res) => {
  res.render('auth/signup'); // Render the signup.ejs view
});

// Render the login page
router.get('/login', (req, res) => {
  res.render('auth/login'); // Render the login.ejs view
});

// Render the email activation page
router.get('/activate', (req, res) => {
  const activationCode = req.query.code; // Get the activation code from the query string
  if (!activationCode) {
    return res.status(400).send('Activation code is required');
  }
  res.render('auth/activate', { activationCode }); // Pass the activation code to the view
});

// Render the password reset request page
router.get('/password-reset', (req, res) => {
  res.render('auth/passwordreset'); // Render the passwordreset.ejs view
});

// Render the recover password page
router.get('/recoverpwd', (req, res) => {
  const resetCode = req.query.code; // Get the reset code from the query string
  if (!resetCode) {
    return res.status(400).send('Reset code is required');
  }
  res.render('auth/recoverpwd', { resetCode }); // Pass the reset code to the view
});

// API Routes
// Handle user sign-up
router.post('/signup', signup);

// Handle user login
router.post('/login', login);

// Handle email verification
router.get('/activate/:token', verifyEmail);

// Handle password recovery
router.post('/recoverpwd', recoverpwd);

// Handle password reset
router.post('/passwordreset', passwordreset);

module.exports = router;

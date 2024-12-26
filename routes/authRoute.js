import { Router } from 'express';
const router = Router();
import { signup, login, verifyEmail, recoverpwd, passwordreset } from '../controllers/authcontroller';

// Serve the signup page
router.get('/signup', (req, res) => {
  res.render('auth/signup');  // Render the signup.ejs view
});

// Serve the login page
router.get('/login', (req, res) => {
  res.render('auth/login');  // Render the login.ejs view
});

// Serve the email activation page
router.get('/activate', (req, res) => {
  const activationCode = req.query.code;  // Get the activation code from the query string
  if (!activationCode) {
    return res.status(400).send('Activation code is required');
  }
  // Pass the activation code to the view for processing
  res.render('auth/activate', { activationCode });
});

// Serve the password reset request page
router.get('/password-reset', (req, res) => {
  res.render('auth/passwordreset');  // Render the passwordreset.ejs view
});

// Serve the recover password page
router.get('/recoverpwd', (req, res) => {
  const resetCode = req.query.code;  // Get the reset code from the query string
  if (!resetCode) {
    return res.status(400).send('Reset code is required');
  }
  // Pass the reset code to the view for processing
  res.render('auth/recoverpwd', { resetCode });
});



// User sign up route
router.post('/signup', signup);

// User login route
router.post('/login', login);

// Email verification route
router.get('/activate/:token', verifyEmail);

// Password reset request route
router.post('/recoverpwd', recoverpwd);

// Reset password route
router.post('/passwordreset', passwordreset);

export default router;

const express = require('express');
const path = require('path');
const authController = require('../controllers/authcontroller'); // Import the controller

const router = express.Router();

// Serve static files from the 'public' folder
router.use(express.static(path.join(__dirname, '../public')));

// Serve the signup page
router.get('/signup', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/signup.html'));
});

// Serve the login page
router.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/login.html'));
});

// Serve the password recovery page
router.get('/recoverpwd', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/recoverpwd.html'));
});

// Serve the account activation page
router.get('/activate', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/activate.html'));
});

// User Registration Route
router.post('/signup', authController.signup);

const signup = async (req, res) => {
    const { username, password, email } = req.body;
  
    // Validate required fields
    if (!username || !password || !email) {
      return res.status(400).json({ error: 'Username, password, and email are required!' });
    }
  
    try {
      // Check if username or email already exists
      const [users] = await db.promise().execute(
        'SELECT id, username, email FROM users WHERE username = ? OR email = ?',
        [username, email]
      );
  
      if (users.length > 0) {
        return res.status(400).json({ error: 'Username or email already taken!' });
      }
  
      // Hash password before saving to the database
      const hashedPassword = await bcrypt.hash(password, 10);
  
      // Create the new user
      const [result] = await db.promise().execute(
        'INSERT INTO users (username, password, email) VALUES (?, ?, ?)',
        [username, hashedPassword, email]
      );
  
      // Generate JWT token
      const token = jwt.sign({ id: result.insertId, username }, process.env.JWT_SECRET, { expiresIn: '1d' });
  
      // Respond with success message and the JWT token
      res.json({ message: 'User registered successfully!', token });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Server error. Please try again later.' });
    }
  };

// Login Route
router.post('/login', authController.login);

const login = async (req, res) => {
    const { username, password, rememberMe } = req.body;
  
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required!' });
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
  

// Password Reset Request Route
router.post('/password-reset', authController.passwordReset);

// Reset Password Route
router.post('/reset-password', authController.resetPassword);

module.exports = router;

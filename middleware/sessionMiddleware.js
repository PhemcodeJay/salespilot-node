// sessionMiddleware.js

const session = require('express-session');

const sessionMiddleware = (req, res, next) => {
  // Check if the session exists
  if (!req.session.user) {
    // If the session does not exist, redirect the user to the login page
    return res.redirect('/login');
  }

  // If the session exists, proceed to the next middleware or route handler
  next();
};

// Optionally, set up a session middleware to handle session storage, cookie configuration, etc.
const sessionConfig = session({
  secret: 'your-secret-key', // Set a secret key for signing session ID cookies
  resave: false, // Do not save session if it wasn't modified
  saveUninitialized: true, // Save the session even if it's not initialized
  cookie: {
    maxAge: 3600000, // Cookie expiration time (1 hour in milliseconds)
    secure: false, // Set to true if using HTTPS (recommended)
  },
});

module.exports = { sessionMiddleware, sessionConfig };

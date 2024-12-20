const session = require('express-session');

// Session Middleware to check if user is authenticated
const sessionMiddleware = (req, res, next) => {
  if (!req.session.user) {
    // If the session does not exist, redirect to the login page
    return res.redirect('/login');
  }

  // Proceed to the next middleware or route handler if session exists
  next();
};

// Session configuration for handling session storage, cookies, etc.
const sessionConfig = session({
  secret: 'your-secret-key', // Secret key for signing session ID cookies
  resave: false, // Do not save the session if it was not modified
  saveUninitialized: true, // Save sessions even if not initialized
  cookie: {
    maxAge: 3600000, // Cookie expiration (1 hour in milliseconds)
    secure: false, // Set to true if using HTTPS (for production environments)
  },
});

module.exports = { sessionMiddleware, sessionConfig };

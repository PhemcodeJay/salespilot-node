const jwt = require('jsonwebtoken');
require('dotenv').config();

// Generate JWT Token
function generateToken(user) {
  const payload = { id: user.id, email: user.email };
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
}

// Verify JWT Token Middleware
function verifyToken(req, res, next) {
  // Extract the token from the authorization header
  const token = req.headers['authorization']?.split(' ')[1]; // In case it's prefixed with 'Bearer'

  if (!token) {
    return res.status(403).send('A token is required for authentication');
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send('Invalid or expired token');
    }
    
    // Attach the decoded user data to the request object
    req.user = decoded;
    
    // Proceed to the next middleware or route handler
    next();
  });
}

module.exports = { generateToken, verifyToken };

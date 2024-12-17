const jwt = require('jsonwebtoken');
require('dotenv').config();

// Generate JWT Token
function generateToken(user) {
  const payload = { id: user.id, email: user.email };
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
}

// Verify JWT Token Middleware
function verifyToken(req, res, next) {
  const token = req.headers['authorization'];
  if (!token) {
    return res.status(403).send('A token is required for authentication');
  }
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send('Invalid or expired token');
    }
    req.user = decoded;
    next();
  });
}

module.exports = { generateToken, verifyToken };

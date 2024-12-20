const jwt = require('jsonwebtoken');
require('dotenv').config();

// Generate JWT Token
function generateToken(user) {
  const payload = { id: user.id, email: user.email };
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
}

// Verify JWT Token
function verifyToken(token) {
  return new Promise((resolve, reject) => {
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) {
        reject(new Error('Invalid or expired token.'));
      } else {
        resolve(decoded);
      }
    });
  });
}

// Middleware to Check Login
async function checkLogin(req, res, next) {
  try {
    // Extract the token from the Authorization header
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
      return res.status(403).json({ error: 'Access denied. No token provided.' });
    }

    // Check if the token is prefixed with "Bearer"
    const token = authHeader.startsWith('Bearer ')
      ? authHeader.split(' ')[1]
      : authHeader;

    if (!token) {
      return res.status(403).json({ error: 'Invalid token format.' });
    }

    // Verify the token
    const decoded = await verifyToken(token);

    // Attach user data to request object
    req.user = decoded;

    // Proceed to the next middleware or route handler
    next();
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
}

module.exports = { generateToken, verifyToken, checkLogin };

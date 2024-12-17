require('dotenv').config();
const jwt = require('jsonwebtoken');

// Load secret key from environment variables
const SECRET_KEY = process.env.JWT_SECRET;

// Function to generate a JWT
const generateToken = (user, expiresIn = '1h') => {
    const payload = {
        id: user.id,
        email: user.email,
    };
    return jwt.sign(payload, SECRET_KEY, { expiresIn });
};

// Middleware to verify a JWT
const verifyToken = (req, res, next) => {
    const token = req.header('x-auth-token'); // Token sent in the request header

    if (!token) {
        return res.status(401).json({ message: 'Access denied, no token provided' });
    }

    try {
        // Verify the token and decode it
        const decoded = jwt.verify(token, SECRET_KEY);
        req.user = decoded; // Attach decoded user info to the request
        next(); // Pass control to the next middleware or route
    } catch (error) {
        return res.status(400).json({ message: 'Invalid token' });
    }
};

// Export both functions for use
module.exports = {
    generateToken,
    verifyToken,
};

// verifyToken.js
const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
    const token = req.header('x-auth-token'); // Token sent in the header

    if (!token) {
        return res.status(401).json({ message: 'Access denied, no token provided' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET); // Replace with your secret key
        req.user = decoded; // Attach the decoded user to the request
        next(); // Move to the next middleware
    } catch (error) {
        res.status(400).json({ message: 'Invalid token' });
    }
};

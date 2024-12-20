require('dotenv').config();
const jwt = require('jsonwebtoken');

const SECRET_KEY = process.env.JWT_SECRET || 'defaultSecretKey'; // Default only for dev

const generateToken = (user, expiresIn = '1h') => {
    const payload = {
        id: user.id,
        email: user.email,
    };
    return jwt.sign(payload, SECRET_KEY, { expiresIn });
};

const verifyToken = (req, res, next) => {
    const token = req.header('x-auth-token');

    if (!token) {
        return res.status(401).json({ message: 'Access denied, no token provided' });
    }

    try {
        const decoded = jwt.verify(token, SECRET_KEY);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(400).json({ message: 'Invalid token' });
    }
};

module.exports = {
    generateToken,
    verifyToken,
};

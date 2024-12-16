const jwt = require('jsonwebtoken');
require('dotenv').config();

const generateToken = (user) => {
    const payload = {
        id: user.id,
        email: user.email,
    };

    const options = {
        expiresIn: '1h', // Token expires in 1 hour
    };

    return jwt.sign(payload, process.env.JWT_SECRET, options);
};

module.exports = { generateToken };

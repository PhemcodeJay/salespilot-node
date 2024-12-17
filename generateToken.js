const { generateToken } = require('./middleware/jwtUtils');

// Example user data
const user = {
    id: 1,
    email: 'user@example.com',
};

// Generate a token
const token = generateToken(user);

console.log('Generated Token:', token);

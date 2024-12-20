const { generateToken } = require('./middleware/jwtUtils');

const user = {
    id: 1,
    email: 'user@example.com',
};

try {
    const token = generateToken(user);
    console.log('Generated Token:', token);
} catch (err) {
    console.error('Error generating token:', err.message);
}

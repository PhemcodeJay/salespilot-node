const { Strategy: JwtStrategy, ExtractJwt } = require('passport-jwt');
require('dotenv').config(); // Load secret key from .env
const fakeUser = {
    id: 1,
    email: 'user@example.com',
}; // Replace with actual database or ORM query

const opts = {
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(), // Extract JWT from Authorization header
    secretOrKey: process.env.JWT_SECRET, // Secret key
};

const jwtStrategy = new JwtStrategy(opts, (payload, done) => {
    try {
        // Example: Replace with a database lookup
        if (payload.id === fakeUser.id) {
            return done(null, fakeUser); // Success: Attach user to request
        } else {
            return done(null, false); // No user found
        }
    } catch (error) {
        return done(error, false);
    }
});

module.exports = (passport) => {
    passport.use(jwtStrategy); // Add the JWT strategy to Passport
};

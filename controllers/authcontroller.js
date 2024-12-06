const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const ActivationCode = require('./models/ActivationCode'); // Path to ActivationCode model
const PasswordReset = require('./models/PasswordReset'); // Path to PasswordReset model
const User = require('./models/User'); // Path to User model
const Subscription = require('./models/Subscription'); // Path to Subscription model

// JWT Secret Key
const JWT_SECRET = 'your_jwt_secret_key';

// Login
exports.login = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required.' });
    }

    try {
        const user = await User.getUserByEmail(email);
        if (!user) {
            return res.status(401).json({ message: 'Invalid email or password.' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid email or password.' });
        }

        // Check if the user is active
        if (!user.is_active) {
            return res.status(403).json({ message: 'Account is not activated.' });
        }

        const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '1h' });
        res.json({ message: 'Login successful.', token });
    } catch (error) {
        res.status(500).json({ message: 'Server error.', error: error.message });
    }
};

// Account Activation
exports.activateAccount = async (req, res) => {
    const { userId, activationCode } = req.body;

    if (!userId || !activationCode) {
        return res.status(400).json({ message: 'User ID and activation code are required.' });
    }

    try {
        // Retrieve the activation code associated with the user
        const record = await ActivationCode.getActivationCodesByUserId(userId);
        if (!record || record.activation_code !== activationCode) {
            return res.status(400).json({ message: 'Invalid activation code.' });
        }

        // Check if the activation code has expired
        if (new Date() > new Date(record.expires_at)) {
            return res.status(400).json({ message: 'Activation code has expired.' });
        }

        // Check if the user's account is already activated
        const user = await User.getUserById(userId);
        if (user.is_active) {
            return res.status(400).json({ message: 'Account is already activated.' });
        }

        // Update user status to active
        await User.updateUserStatus(userId, { is_active: true });

        // Delete the activation code from the database
        await ActivationCode.deleteActivationCode(record.id);

        res.json({ message: 'Account activated successfully.' });
    } catch (error) {
        res.status(500).json({ message: 'Server error.', error: error.message });
    }
};

// Request Password Reset
exports.requestPasswordReset = async (req, res) => {
    const { email, csrf_token } = req.body;

    if (!email) {
        return res.status(400).json({ message: 'Email is required.' });
    }

    if (csrf_token && csrf_token !== req.session.csrf_token) {
        return res.status(403).json({ message: 'Invalid CSRF token.' });
    }

    try {
        const user = await User.getUserByEmail(email);
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        const resetCode = Math.random().toString(36).slice(-8).toUpperCase();
        const expiresAt = new Date(Date.now() + 3600 * 1000); // 1-hour expiration

        await PasswordReset.createPasswordResetRecord({
            user_id: user.id,
            reset_code: resetCode,
            expires_at: expiresAt
        });

        console.log(`Reset code for ${email}: ${resetCode}`); // Replace with email sending logic

        res.json({ message: 'Password reset requested. Check your email for the reset code.' });
    } catch (error) {
        res.status(500).json({ message: 'Server error.', error: error.message });
    }
};

// Reset Password
exports.resetPassword = async (req, res) => {
    const { userId, resetCode, newPassword } = req.body;

    if (!userId || !resetCode || !newPassword) {
        return res.status(400).json({ message: 'User ID, reset code, and new password are required.' });
    }

    try {
        const record = await PasswordReset.getPasswordResetByUserId(userId);
        if (!record || record.reset_code !== resetCode) {
            return res.status(400).json({ message: 'Invalid reset code.' });
        }

        if (new Date() > new Date(record.expires_at)) {
            return res.status(400).json({ message: 'Reset code has expired.' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await User.updatePassword(userId, hashedPassword);
        await PasswordReset.deletePasswordReset(record.id);

        res.json({ message: 'Password reset successfully.' });
    } catch (error) {
        res.status(500).json({ message: 'Server error.', error: error.message });
    }
};

// Signup
exports.signup = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required.' });
    }

    try {
        const existingUser = await User.getUserByEmail(email);
        if (existingUser) {
            return res.status(400).json({ message: 'Email is already in use.' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = await User.createUser({ email, password: hashedPassword });

        // Generate activation code and expiration time (e.g., 24 hours)
        const activationCode = Math.random().toString(36).slice(-8).toUpperCase();
        const expiresAt = new Date(Date.now() + 86400 * 1000); // 1-day expiration

        // Store the activation code in the database
        await ActivationCode.createActivationCode({
            user_id: newUser.id,
            activation_code: activationCode,
            expires_at: expiresAt
        });

        console.log(`Activation code for ${email}: ${activationCode}`); // Replace with email sending logic

        // Send the activation email (this can be done with an email service)
        // Replace this with actual email sending logic

        res.json({
            message: 'Signup successful. Please check your email for the activation code.',
            subscriptionId: newUser.subscriptionId
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error.', error: error.message });
    }
};

module.exports = {
    login,
    activateAccount,
    requestPasswordReset,
    resetPassword,
    signup
};

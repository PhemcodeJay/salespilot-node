const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const ActivationCode = require('./models/ActivationCode'); // Path to ActivationCode model
const PasswordReset = require('./models/PasswordReset'); // Path to PasswordReset model
const User = require('./models/User'); // Path to your User model

// JWT Secret Key
const JWT_SECRET = 'your_jwt_secret_key';

// Login
exports.login = async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await User.getUserByEmail(email);
        if (!user) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '1h' });
        res.json({ message: 'Login successful', token });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Account Activation
exports.activateAccount = async (req, res) => {
    const { userId, activationCode } = req.body;

    try {
        const record = await ActivationCode.getActivationCodesByUserId(userId);
        if (!record || record.activation_code !== activationCode) {
            return res.status(400).json({ message: 'Invalid activation code' });
        }

        // Check if code has expired
        if (new Date() > new Date(record.expires_at)) {
            return res.status(400).json({ message: 'Activation code has expired' });
        }

        await User.updateUserStatus(userId, { is_active: true });
        await ActivationCode.deleteActivationCode(record.id);

        res.json({ message: 'Account activated successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Request Password Reset
exports.requestPasswordReset = async (req, res) => {
    const { email } = req.body;

    try {
        const user = await User.getUserByEmail(email);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const resetCode = Math.random().toString(36).substr(2, 8); // Generate a simple reset code
        const expiresAt = new Date(Date.now() + 3600 * 1000); // 1-hour expiration

        await PasswordReset.createPasswordResetRecord({
            user_id: user.id,
            reset_code: resetCode,
            expires_at: expiresAt
        });

        console.log(`Reset code for ${email}: ${resetCode}`); // Replace with email sending logic

        res.json({ message: 'Password reset requested. Check your email for the reset code.' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Reset Password
exports.resetPassword = async (req, res) => {
    const { userId, resetCode, newPassword } = req.body;

    try {
        const record = await PasswordReset.getPasswordResetByUserId(userId);
        if (!record || record.reset_code !== resetCode) {
            return res.status(400).json({ message: 'Invalid reset code' });
        }

        // Check if code has expired
        if (new Date() > new Date(record.expires_at)) {
            return res.status(400).json({ message: 'Reset code has expired' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await User.updatePassword(userId, hashedPassword);
        await PasswordReset.deletePasswordReset(record.id);

        res.json({ message: 'Password reset successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

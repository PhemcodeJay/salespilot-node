const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const User = require('../models/user');
const Feedback = require('../models/contact');
const { sendAccountActivationEmail } = require('../utils/email'); // Assuming email utility is set up
const generateActivationCode = require('../utils/activationCode'); // Assuming activation code generator is set up

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key';

// Centralized Response Helper
const sendResponse = (res, status, msg, data = null) => {
    const response = { msg };
    if (data) response.data = data;
    res.status(status).json(response);
};

// Register User
const registerUser = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return sendResponse(res, 400, 'Validation failed', errors.array());

    const { username, email, password } = req.body;

    try {
        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) return sendResponse(res, 400, 'User already exists');

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Generate an activation code
        const activationCode = generateActivationCode();

        // Set the user with trial period
        const newUser = new User({
            username,
            email,
            password: hashedPassword,
            activationCode,
            isActive: false,
            trialEnds: null, // Trial starts upon activation
        });

        // Save the new user to the database
        await newUser.save();

        // Send activation email
        const emailSent = await sendAccountActivationEmail(email, activationCode);
        if (!emailSent) return sendResponse(res, 500, 'Failed to send activation email');

        sendResponse(res, 201, 'User registered successfully. Please check your email to activate your account.');
    } catch (error) {
        console.error(error);
        sendResponse(res, 500, 'Server error');
    }
};

// Activate Account
const activateAccount = async (req, res) => {
    const { email, activationCode } = req.body;

    try {
        // Find the user by email
        const user = await User.findOne({ email });
        if (!user) return sendResponse(res, 404, 'User not found');
        if (user.isActive) return sendResponse(res, 400, 'Account is already activated');

        // Verify the activation code
        if (user.activationCode !== activationCode) return sendResponse(res, 400, 'Invalid activation code');

        // Activate the account and set the trial period to 3 months
        user.isActive = true;
        user.activationCode = null;
        user.trialEnds = Date.now() + 3 * 30 * 24 * 60 * 60 * 1000; // 3 months in milliseconds
        await user.save();

        sendResponse(res, 200, 'Account activated successfully. Your 3-month trial has started.');
    } catch (error) {
        console.error(error);
        sendResponse(res, 500, 'Server error');
    }
};

// Login User
const loginUser = async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email });
        if (!user) return sendResponse(res, 404, 'User not found');
        if (!user.isActive) return sendResponse(res, 403, 'Account is not activated. Please activate your account.');

        // Check if the password matches
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return sendResponse(res, 401, 'Invalid credentials');

        // Check if the trial period has expired
        if (user.trialEnds && Date.now() > user.trialEnds) {
            user.isActive = false;
            user.subscriptionType = 'expired';
            await user.save();
            return sendResponse(res, 400, 'Your trial period has expired. Please subscribe to continue using the service.');
        }

        // Create a JWT token
        const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '1h' });

        sendResponse(res, 200, 'Login successful', { token });
    } catch (error) {
        console.error(error);
        sendResponse(res, 500, 'Server error');
    }
};

// Logout User
const logoutUser = (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (token) {
        // Add token to invalidated tokens list (optional)
        // invalidTokens.add(token);
    }
    sendResponse(res, 200, 'Logged out successfully');
};

// Submit Feedback
const submitFeedback = async (req, res) => {
    const { username, feedback } = req.body;

    try {
        await Feedback.create({ username, feedback });
        sendResponse(res, 200, 'Feedback received successfully');
    } catch (error) {
        console.error(error);
        sendResponse(res, 500, 'Server error');
    }
};

// Reset Password
const resetPassword = async (req, res) => {
    const { email, resetCode, newPassword } = req.body;

    try {
        // Find the user by email
        const user = await User.findOne({ email });
        if (!user || user.resetCode !== resetCode) return sendResponse(res, 400, 'Invalid reset code');

        // Hash the new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update the password and reset the reset code
        user.password = hashedPassword;
        user.resetCode = null;
        await user.save();

        sendResponse(res, 200, 'Password updated successfully');
    } catch (error) {
        console.error(error);
        sendResponse(res, 500, 'Server error');
    }
};

module.exports = {
    registerUser,
    activateAccount,
    loginUser,
    logoutUser,
    submitFeedback,
    resetPassword
};

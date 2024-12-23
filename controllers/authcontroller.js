const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const User = require('../models/user'); // Assuming you have a User model
const { sendPasswordResetEmail, sendAccountActivationEmail } = require('../utils/email'); // Assuming email utils are set up

// Signup Controller
exports.signup = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { username, password, email } = req.body;

    try {
        // Check if the user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ msg: 'User already exists' });
        }

        // Hash the password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Get current date for trial start
        const trialStartDate = new Date();
        // Set trial end date to 3 months from now
        const trialEndDate = new Date(trialStartDate);
        trialEndDate.setMonth(trialEndDate.getMonth() + 3);

        // Create the new user with trial period details
        const newUser = new User({
            username,
            email,
            password: hashedPassword,
            isActive: false, // Set account as inactive until activation
            trialStartDate,   // Add trial start date
            trialEndDate,     // Add trial end date
            subscriptionType: 'trial',  // Set initial subscription type as 'trial'
        });

        // Save the user to the database
        await newUser.save();

        // Send activation email
        sendAccountActivationEmail(newUser.email, newUser._id);

        res.status(201).json({ msg: 'User registered successfully. Please check your email to activate your account.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Server error' });
    }
};

// Account Activation Controller
exports.activateAccount = async (req, res) => {
    const { activationCode } = req.body;

    try {
        // Find the user by activation code (could be stored in the database or sent as a JWT)
        const user = await User.findOne({ activationCode });

        if (!user) {
            return res.status(400).json({ msg: 'Invalid activation code' });
        }

        // Activate the user account
        user.isActive = true;
        await user.save();

        res.status(200).json({ msg: 'Account activated successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Server error' });
    }
};

// Login Controller
exports.login = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { username, password } = req.body;

    try {
        // Find user by username
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(400).json({ msg: 'Invalid credentials' });
        }

        // Check if account is active
        if (!user.isActive) {
            return res.status(400).json({ msg: 'Account is not activated. Please check your email' });
        }

        // Check if trial has expired
        const currentDate = new Date();
        if (user.trialEndDate && currentDate > new Date(user.trialEndDate)) {
            user.subscriptionType = 'expired';
            await user.save();
            return res.status(400).json({ msg: 'Your trial period has expired. Please subscribe to continue using the service.' });
        }

        // Compare password with hashed password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ msg: 'Invalid credentials' });
        }

        // Create JWT token
        const payload = { userId: user._id };
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });

        res.json({ token });
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Server error' });
    }
};

// Send Feedback Controller
exports.sendFeedback = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { username, feedback } = req.body;

    // Save feedback in database (assuming you have a Feedback model)
    // await Feedback.create({ username, feedback });

    res.status(200).json({ msg: 'Feedback received successfully' });
};

// Manage Subscription Controller
exports.manageSubscription = async (req, res) => {
    const { userId, subscriptionType } = req.body;

    try {
        const user = await User.findById(userId);
        if (!user) {
            return res.status(400).json({ msg: 'User not found' });
        }

        // Handle subscription type update (e.g., upgrade or downgrade)
        user.subscriptionType = subscriptionType;
        if (subscriptionType !== 'trial') {
            user.trialEndDate = null; // Remove trial period if the user subscribes
        }
        await user.save();

        res.status(200).json({ msg: 'Subscription updated successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Server error' });
    }
};

// Logout Controller
exports.logout = (req, res) => {
    // Invalidate the token or remove it from the frontend
    res.status(200).json({ msg: 'Logged out successfully' });
};

// Password Reset Request Controller
exports.passwordResetRequest = async (req, res) => {
    const { user_id } = req.body;

    try {
        // Find the user by ID
        const user = await User.findById(user_id);
        if (!user) {
            return res.status(400).json({ msg: 'User not found' });
        }

        // Generate a reset token
        const resetToken = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

        // Send password reset email with the reset token
        sendPasswordResetEmail(user.email, resetToken);

        res.status(200).json({ msg: 'Password reset email sent successfully' });
    } catch (error)        {
        console.error(error);
        res.status(500).json({ msg: 'Server error' });
    }
};

// Validate Password Reset Code Controller
exports.validatePasswordReset = async (req, res) => {
    const { reset_code } = req.body;

    try {
        // Verify the reset code
        jwt.verify(reset_code, process.env.JWT_SECRET);

        res.status(200).json({ msg: 'Reset code is valid' });
    } catch (error) {
        console.error(error);
        res.status(400).json({ msg: 'Invalid or expired reset code' });
    }
};

// Reset Password Controller
exports.resetPassword = async (req, res) => {
    const { user_id, reset_code, new_password } = req.body;

    try {
        // Verify the reset code
        const decoded = jwt.verify(reset_code, process.env.JWT_SECRET);

        if (decoded.userId !== user_id) {
            return res.status(400).json({ msg: 'Invalid reset request' });
        }

        // Find the user by ID
        const user = await User.findById(user_id);
        if (!user) {
            return res.status(400).json({ msg: 'User not found' });
        }

        // Hash the new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(new_password, salt);

        // Update the user's password
        user.password = hashedPassword;
        await user.save();

        res.status(200).json({ msg: 'Password updated successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Server error' });
    }
};

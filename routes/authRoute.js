const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const User = require('../models/user');
const Feedback = require('../models/contact'); // Assuming Feedback model is available
const { sendPasswordResetEmail, sendAccountActivationEmail } = require('../utils/email');

// Load Views
router.get('/login', (req, res) => {
    res.render('auth/login', { error: null });
});

router.get('/signup', (req, res) => {
    res.render('auth/signup', { error: null });
});

router.get('/activate', (req, res) => {
    res.render('auth/activate', { error: null });
});

router.get('/passwordreset', (req, res) => {
    res.render('auth/passwordreset', { error: null });
});

router.get('/recoverpwd', (req, res) => {
    res.render('auth/recoverpwd', { error: null });
});


// Signup Route
router.post('/signup', async (req, res) => {
    const errors = validationResult(req);
    
    // If there are validation errors, return them
    if (!errors.isEmpty()) {
        return res.render('auth/signup', {
            error_message: errors.array().map(err => err.msg).join(', '),
            success: null // Clear any success message if errors occur
        });
    }

    const { username, password, confirm_password, email } = req.body;

    // Ensure password and confirm password match
    if (password !== confirm_password) {
        return res.render('auth/signup', {
            error_message: 'Passwords do not match.',
            success: null // Clear any success message if errors occur
        });
    }

    try {
        // Check if the user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.render('auth/signup', {
                error_message: 'User already exists. Please use a different email.',
                success: null // Clear any success message if errors occur
            });
        }

        // Hash the password before saving it
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create a new user
        const newUser = new User({
            username,
            email,
            password: hashedPassword,
            isActive: false, 
        });

        // Save the new user to the database
        await newUser.save();

        // Send account activation email
        sendAccountActivationEmail(newUser.email, newUser._id);

        // Render the signup page with a success message
        res.render('auth/signup', {
            error_message: null, // Clear any error message
            success: 'User registered successfully. Please check your email to activate your account.'
        });
    } catch (error) {
        console.error(error);
        res.render('auth/signup', {
            error_message: 'Server error. Please try again later.',
            success: null // Clear any success message in case of an error
        });
    }
});



// Account Activation Route
router.post('/activate', async (req, res) => {
    const { activationCode } = req.body;

    try {
        const user = await User.findOne({ activationCode });
        if (!user) {
            return res.render('auth/activate', {
                error: 'Invalid activation code. Please check the code and try again.'
            });
        }

        // Activate user account
        user.isActive = true;
        await user.save();

        res.render('auth/activate', {
            error: null,
            success: 'Account activated successfully! You can now log in.'
        });
    } catch (error) {
        console.error(error);
        res.render('auth/activate', {
            error: 'Server error. Please try again later.'
        });
    }
});

// Login Route
router.post('/login', async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.render('auth/login', {
            error: errors.array().map(err => err.msg).join(', ') // Pass the error message to the view
        });
    }

    const { username, password } = req.body;

    try {
        const user = await User.findOne({ username });
        if (!user) {
            return res.render('auth/login', {
                error: 'Invalid credentials. Please check your username and password.'
            });
        }

        if (!user.isActive) {
            return res.render('auth/login', {
                error: 'Account is not activated. Please check your email.'
            });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.render('auth/login', {
                error: 'Invalid credentials. Please check your username and password.'
            });
        }

        const payload = { userId: user._id };
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });

        res.redirect('/dashboard'); // Redirect to the dashboard (you can change this route as needed)
    } catch (error) {
        console.error(error);
        res.render('auth/login', {
            error: 'Server error. Please try again later.'
        });
    }
});


// Password Reset Request Route
router.post('/passwordreset', async (req, res) => {
    const { email } = req.body;

    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.render('auth/passwordreset', {
                error: 'User not found. Please check your email and try again.'
            });
        }

        const resetToken = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

        sendPasswordResetEmail(user.email, resetToken);

        res.render('auth/passwordreset', {
            error: null,
            success: 'Password reset email sent successfully. Please check your inbox.'
        });
    } catch (error) {
        console.error(error);
        res.render('auth/passwordreset', {
            error: 'Server error. Please try again later.'
        });
    }
});

// Validate Password Reset Code Route
router.post('/validatepasswordreset', async (req, res) => {
    const { reset_code } = req.body;

    try {
        jwt.verify(reset_code, process.env.JWT_SECRET);
        res.render('auth/recoverpwd', {
            error: null,
            success: 'Reset code is valid. Please enter your new password.'
        });
    } catch (error) {
        console.error(error);
        res.render('auth/recoverpwd', {
            error: 'Invalid or expired reset code. Please try again.'
        });
    }
});

// Reset Password Route
router.post('/resetpassword', async (req, res) => {
    const { user_id, reset_code, new_password } = req.body;

    try {
        const decoded = jwt.verify(reset_code, process.env.JWT_SECRET);
        if (decoded.userId !== user_id) {
            return res.render('auth/recoverpwd', {
                error: 'Invalid reset request. Please try again.'
            });
        }

        const user = await User.findById(user_id);
        if (!user) {
            return res.render('auth/recoverpwd', {
                error: 'User not found. Please try again.'
            });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(new_password, salt);

        user.password = hashedPassword;
        await user.save();

        res.redirect('/auth/login'); // Redirect to login after password reset
    } catch (error) {
        console.error(error);
        res.render('auth/recoverpwd', {
            error: 'Server error. Please try again later.'
        });
    }
});

// Feedback Route
router.get('/feedback', (req, res) => {
    res.render('auth/feedback', { error: null, success: null });
});

router.post('/submit-feedback', async (req, res) => {
    const { rating, comments } = req.body;

    try {
        // Save feedback to the database or perform any other action you want
        const feedback = new Feedback({
            rating,
            comments,
            submittedAt: new Date()
        });

        await feedback.save(); // Assuming you have a Feedback model set up

        res.render('auth/feedback', {
            error: null,
            success: 'Thank you for your feedback!'
        });
    } catch (error) {
        console.error(error);
        res.render('auth/feedback', {
            error: 'Error submitting feedback. Please try again later.',
            success: null
        });
    }
});

// Export the router
module.exports = router;

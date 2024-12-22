const express = require('express');
const authController = require('../controllers/authcontroller');
const router = express.Router();
const nodemailer = require('nodemailer');

// Signup route
router.post('/signup', authController.signup);

// Activate account route
router.post('/activate', authController.activateAccount);

// Request password reset route
router.post('/password-reset/request', authController.requestPasswordReset);

// Reset password route
router.post('/password-reset/reset', authController.resetPassword);

// Login route
router.post('/login', authController.login);

// Logout route
router.post('/logout', authController.logout);

// Feedback mail route
router.post('/feedback', async (req, res) => {
    const { name, email, message } = req.body;
    
    if (!name || !email || !message) {
        return res.status(400).json({ error: 'All fields (name, email, message) are required.' });
    }

    // Configure Nodemailer transport
    const transporter = nodemailer.createTransport({
        service: 'gmail', // Use your email service
        auth: {
            user: 'your-email@gmail.com', // Your email address
            pass: 'your-email-password',  // Your email password or app-specific password
        },
    });

    // Define mail options
    const mailOptions = {
        from: email,          // Sender's email (user's email)
        to: 'support@yourdomain.com',  // Destination email (admin/support email)
        subject: `Feedback from ${name}`,
        text: message, // Feedback message
    };

    try {
        // Send email
        await transporter.sendMail(mailOptions);
        res.status(200).json({ message: 'Feedback sent successfully!' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to send feedback. Please try again later.' });
    }
});

module.exports = router;

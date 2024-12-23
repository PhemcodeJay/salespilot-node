// utils/email.js
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'ionos', // Replace with your email provider
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

const sendEmail = async (to, subject, text) => {
    try {
        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to,
            subject,
            text,
        });
    } catch (error) {
        throw new Error('Failed to send email');
    }
};

module.exports = { sendEmail };

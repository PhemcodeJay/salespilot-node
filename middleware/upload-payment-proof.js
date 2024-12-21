const express = require('express');
const multer = require('multer');
const nodemailer = require('nodemailer');
const mysql = require('mysql2');
const path = require('path');

// Create an Express app
const app = express();
const port = 3000;

// Configure Multer for file uploads
const uploadDir = 'uploads/payment_proofs/';
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname)); // Unique file name
    }
});
const upload = multer({
    storage: storage,
    limits: { fileSize: 15 * 1024 * 1024 }, // 15MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only JPG, PNG, and PDF are allowed.'));
        }
    }
});

// Create a MySQL connection
const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'salespilot'
});

// Create Nodemailer transporter
const transporter = nodemailer.createTransport({
    host: 'smtp.ionos.com',
    port: 587,
    secure: false, // use TLS
    auth: {
        user: 'admin@cybertrendhub.store',
        pass: 'kokochulo@1987#'
    }
});

// Middleware to parse JSON bodies
app.use(express.json());

// Middleware for validating the payment method
const validatePaymentMethod = (req, res, next) => {
    const { payment_method } = req.body;
    const validPaymentMethods = ['paypal', 'binance', 'mpesa', 'naira'];
    if (!validPaymentMethods.includes(payment_method)) {
        return res.status(400).json({ success: false, message: 'Invalid payment method selected.' });
    }
    next();
};

// Middleware for inserting payment information into the database
const insertPaymentInfo = (req, res, next) => {
    const { payment_method } = req.body;
    const paymentProofPath = req.file.path;

    const query = 'INSERT INTO payments (payment_method, payment_proof) VALUES (?, ?)';
    connection.execute(query, [payment_method, paymentProofPath], (err, result) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Database error: ' + err.message });
        }
        req.paymentResult = result;
        next();
    });
};

// Middleware for sending email with payment proof
const sendPaymentEmail = (req, res) => {
    const { payment_method } = req.body;
    const paymentProofPath = req.file.path;

    const mailOptions = {
        from: 'info@salespilot.cybertrendhub.store',
        to: 'admin@cybertrendhub.store',
        subject: 'New Payment Proof Uploaded',
        html: `<p>A new payment proof has been uploaded for payment method: ${payment_method}. Please review the attached file.</p>`,
        attachments: [{
            filename: req.file.originalname,
            path: paymentProofPath
        }]
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            return res.status(500).json({ success: false, message: 'Email sending failed: ' + error.message });
        }
        res.json({ success: true, message: 'Payment proof uploaded and email sent successfully.' });
    });
};

// Route for handling file upload and payment submission
app.post('/upload-payment-proof', upload.single('payment_proof'), validatePaymentMethod, insertPaymentInfo, sendPaymentEmail);


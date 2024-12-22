const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql2');
const nodemailer = require('nodemailer');

// Create an Express app
const app = express();
app.use(bodyParser.urlencoded({ extended: true }));

// Database connection
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'your_database_name' // Replace with your database name
});

db.connect(err => {
    if (err) {
        console.error('Database connection failed: ' + err.stack);
        return;
    }
    console.log('Connected to the database.');
});

// Setup Nodemailer
const transporter = nodemailer.createTransport({
    host: 'smtp.ionos.com',
    port: 587,
    secure: false, // TLS
    auth: {
        user: 'admin@cybertrendhub.store', // IONOS email address
        pass: 'kokochulo@1987#'           // IONOS email password
    }
});

// Middleware for handling form submission
const handleFormSubmission = (req, res, next) => {
    const { name, email, phone, message } = req.body;

    // Validate inputs
    const errors = [];
    if (!name) errors.push('Name is required.');
    if (!email) {
        errors.push('Email is required.');
    } else if (!/\S+@\S+\.\S+/.test(email)) {
        errors.push('Email is not valid.');
    }
    if (!phone) errors.push('Phone number is required.');
    if (!message) errors.push('Message is required.');

    if (errors.length > 0) {
        return res.status(400).send(errors);
    }

    // Insert data into the database
    const query = 'INSERT INTO contacts (name, email, phone, message) VALUES (?, ?, ?, ?)';
    db.execute(query, [name, email, phone, message], (err, results) => {
        if (err) {
            console.error('Database error: ' + err);
            return res.status(500).send('Error saving data to the database.');
        }

        // Proceed to send email
        req.contactInfo = { name, email, phone, message };
        next();
    });
};

// Middleware for sending the email
const sendEmailNotification = (req, res) => {
    const { name, email, phone, message } = req.contactInfo;

    const mailOptions = {
        from: '"CyberTrendHub" <admin@cybertrendhub.store>',
        to: 'phemcodejay@gmail.com',
        replyTo: email,
        subject: `New Feedback Message from ${name}`,
        text: `Name: ${name}\nEmail: ${email}\nPhone: ${phone}\nMessage:\n${message}`
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error('Error sending email: ' + error);
            return res.status(500).send('Error sending email.');
        }

        console.log('Email sent: ' + info.response);

        // Respond to client with success message
        res.send(`
            <div class="alert alert-success">Thank you, ${name}! Your message has been sent.</div>
            <script>
                setTimeout(function() {
                    window.location.href = 'index.html';
                }, 2000); // Redirect after 2 seconds
            </script>
        `);
    });
};

// Route for form submission
app.post('/submit-form', handleFormSubmission, sendEmailNotification);

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

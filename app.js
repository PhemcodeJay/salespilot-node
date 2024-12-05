// app.js
const express = require('express');
const mysql = require('mysql2');
const path = require('path');
const session = require('express-session');
const bodyParser = require('body-parser');

// Import Routes
const supplierRoute = require('./routes/supplierRoute');
const invoiceRoute = require('./routes/invoiceRoute');
const salesRoute = require('./routes/salesRoute');
const reportRoute = require('./routes/reportRoute');
const productRoute = require('./routes/productRoute');
const userRoute = require('./routes/userRoute');

// Initialize Express App
const app = express();

// Database Connection
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'dbs13455438'
});

// Check Database Connection
db.connect((err) => {
    if (err) {
        console.error('Database connection error:', err);
        process.exit(1); // Exit the application if DB connection fails
    }
    console.log('Connected to the MySQL database.');
});

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Session Configuration
app.use(session({
    secret: 'your-secret-key', // Use a strong secret key here
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // Set to true if using HTTPS
}));

// Serve static files (CSS, JS, Images)
app.use(express.static(path.join(__dirname, 'public')));

// Serve Index.html (Main Page)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Use Routes
app.use('/api/supplier', supplierRoute);  // Supplier routes
app.use('/api/invoice', invoiceRoute);    // Invoice routes
app.use('/api/sales', salesRoute);        // Sales routes
app.use('/api/report', reportRoute);      // Report routes
app.use('/api/product', productRoute);    // Product routes
app.use('/api/user', userRoute);          // User routes

// Default error handling for undefined routes
app.use((req, res, next) => {
    res.status(404).json({ message: 'Route not found' });
});

// Global Error Handler Middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({ message: 'Internal Server Error', error: err.message });
});

// Start the Server
const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});

module.exports = app;

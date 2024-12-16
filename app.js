require('dotenv').config();

// app.js
const express = require('express');
const mysql = require('mysql2');
const path = require('path');
const session = require('express-session');
const bodyParser = require('body-parser');
const router = express.Router(); // Create a router instance
const paypalRoutes = require('./paypal');

// Import Routes
const dashboardRoutes = require('./routes/dashboardRoute');
const supplierRoute = require('./routes/supplierRoute');
const invoiceRoute = require('./routes/invoiceRoute');
const salesRoute = require('./routes/salesRoute');
const categoryreportRoute = require('./routes/category-reportRoute');
const productreportRoute = require('./routes/product-reportRoute');
const productRoute = require('./routes/productRoute');
const chartRoute = require('./routes/chartRoute');
const chartreportRoute = require('./routes/chart-reportRoute');
const authRoute = require('./routes/authRoute');
const categoryRoute = require('./routes/categoryRoute');
const customerRoute = require('./routes/customerRoute');
const expenseRoute = require('./routes/expenseRoute');
const inventoryRoute = require('./routes/inventoryRoute');
const notificationRoute = require('./routes/notificationRoute');
const pageAccessRoute = require('./routes/page-accessRoute');
const payRoute = require('./routes/payRoute');
const profileRoute = require('./routes/profileRoute');
const staffRoute = require('./routes/staffRoute');
const subscriptionRoute = require('./routes/subscriptionRoute');

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

// Route for /dashboard
app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
  });

// Import the cron job for subscriptions
require('./cron/subscriptioncron');  // This will start the cron job


// Use Routes
app.use('/api/dashboard', dashboardRoutes);    // Dashboard routes
app.use('/api/supplier', supplierRoute);      // Supplier routes
app.use('/api/invoice', invoiceRoute);        // Invoice routes
app.use('/api/sales', salesRoute);            // Sales routes
app.use('/api/categoryreport', categoryreportRoute);          // Report routes
app.use('/api/productreport', productreportRoute);      
app.use('/api/product', productRoute);        // Product routes
app.use('/api/chart', chartRoute);    // Analytics routes
app.use('/api/chartreport', chartreportRoute);    // Analytics routes
app.use('/api/auth', authRoute);              // Authentication routes
app.use('/api/category', categoryRoute);      // Category routes
app.use('/api/customer', customerRoute);      // Customer routes
app.use('/api/expense', expenseRoute);        // Expense routes
app.use('/api/inventory', inventoryRoute);    // Inventory routes
app.use('/api/notification', notificationRoute); // Notification routes
app.use('/api/page-access', pageAccessRoute); // Page Access routes
app.use('/api/pay', payRoute);                // Payment routes
app.use('/api/profile', profileRoute);        // Profile routes
app.use('/api/staff', staffRoute);            // Staff routes
app.use('/api/subscriptions', subscriptionRoute); // Use the subscription routes
app.use('/paypal', paypalRoutes);

// Default error handling for undefined routes
app.use((req, res, next) => {
    res.status(404).json({ message: 'Route not found' });
});

// Global Error Handler Middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({ message: 'Internal Server Error', error: err.message });
});

// Sample pricing plans
const pricingPlans = [
    { planKey: 'Starter', planName: 'Starter Plan', price: '5.00', paypalPlanId: 'P-7E210255TM029860GM5HYC4A' },
    { planKey: 'Buisness', planName: 'Buisness Plan', price: '15.00', paypalPlanId: 'P-7E210255TM029860GM5HYC4B' },
    { planKey: 'Enterprise', planName: 'Enterprise Plan', price: '25.00', paypalPlanId: 'P-7E210255TM029860GM5HYC4C' }
];


// Start the Server
const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});

module.exports = app;
const express = require('express');
const bodyParser = require('body-parser');
const passport = require('passport');
require('dotenv').config();
const { generateToken } = require('./middleware/jwtUtils'); // JWT generation helper
require('./config/passport')(passport); // Passport configuration

const app = express();
app.use(bodyParser.json());

// Initialize Passport
app.use(passport.initialize());

// Login route to generate token
app.post('/login', (req, res) => {
    const { email, password } = req.body;
    const fakeUser = { id: 1, email: 'user@example.com', password: 'password123' };

    if (email === fakeUser.email && password === fakeUser.password) {
        const token = generateToken(fakeUser); // Generate JWT
        return res.json({ token });
    } else {
        return res.status(401).json({ error: 'Invalid credentials.' });
    }
});

// Protected route
app.get(
    '/protected',
    passport.authenticate('jwt', { session: false }), // Passport middleware for JWT verification
    (req, res) => {
        res.json({ message: `Hello, ${req.user.email}`, user: req.user });
    }
);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
const express = require('express');
const jwt = require('jsonwebtoken');

const app = express();
app.use(express.json());

const SECRET_KEY = 'your_secret_key_here'; // Replace with your secret

// Login route to generate JWT
app.post('/login', (req, res) => {
    const { email, password } = req.body;

    // Example user validation (replace with database query)
    if (email === 'user@example.com' && password === 'password123') {
        const token = jwt.sign({ email, role: 'admin' }, SECRET_KEY, { expiresIn: '1h' });
        return res.json({ token });
    }

    return res.status(401).json({ error: 'Invalid credentials.' });
});

// Protected route to verify JWT
app.get('/protected', (req, res) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Get token from Bearer header

    if (!token) {
        return res.status(401).json({ error: 'Token is required.' });
    }

    try {
        const decoded = jwt.verify(token, SECRET_KEY);
        res.json({ message: 'Protected data accessed.', user: decoded });
    } catch (err) {
        res.status(403).json({ error: 'Invalid or expired token.' });
    }
});

// Start the server
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

// Required dependencies
const express = require('express');
const path = require('path');
const mysql = require('mysql2');
const session = require('express-session');
const bodyParser = require('body-parser');
const passport = require('passport');
const bcrypt = require('bcryptjs'); // For password hashing
require('dotenv').config(); // Load environment variables from .env file
const { generateToken, verifyToken } = require('./config/auth'); // JWT helper
const openai = require('openai'); // OpenAI SDK for tenant use cases
const paypalClient = require('./config/paypalconfig'); // PayPal client configuration
require('./config/passport')(passport); // Passport configuration
const csrf = require('csurf');

// Initialize Express App
const app = express();

// Database Connection
const db = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'dbs13455438',
});

// Check Database Connection
db.connect((err) => {
    if (err) {
        console.error('Database connection error:', err);
        process.exit(1); // Exit the application if DB connection fails
    }
    console.log('Connected to the MySQL database.');
});

// Middleware Setup
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Session Configuration
app.use(
    session({
        secret: process.env.SESSION_SECRET || 'your-secret-key',
        resave: false,
        saveUninitialized: true,
        cookie: { secure: false }, // Set to true if using HTTPS
    })
);

// Passport Middleware
app.use(passport.initialize());
app.use(passport.session());

// Serve Static Files
app.use('/assets', express.static(path.join(__dirname, 'public', 'assets')));
app.use('/home_assets', express.static(path.join(__dirname, 'public', 'home_assets')));

// Set EJS as the view engine
app.set('view engine', 'ejs');

// Middleware to parse the body of requests
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// CSRF Protection Middleware
const csrfProtection = csrf({ cookie: true });

// CSRF-protected form route
app.get('/form', csrfProtection, (req, res) => {
    res.send(`<form action="/submit" method="POST">
                 <input type="hidden" name="_csrf" value="${req.csrfToken()}">
                 <button type="submit">Submit</button>
              </form>`);
});

app.post('/submit', csrfProtection, (req, res) => {
    res.send('Form submitted successfully!');
});

// Set the views folder to 'views'
app.set('views', path.join(__dirname, 'views'));

// Serve static files (CSS, JS, images, etc.) from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// Render 'index.ejs' from 'views/home'
app.get('/', (req, res) => {
    const loginLink = '/auth/login'; // Link to login page
    res.render('home/index', { loginLink: loginLink }); // Pass loginLink here
});

app.get('/reset-password', (req, res) => {
    res.render('reset-password', {
        csrf_token: req.csrfToken(),
        reset_code: req.query.token
    });
});

// Define the route for login
app.get('/auth/login', (req, res) => {
    res.render('auth/login');  // Render the login.ejs file
});

// Route to render the activation page
app.get('/activate', (req, res) => {
    const activationToken = req.query.token;
    let successMessage = null;
    let errorMessage = null;

    if (activationToken) {
        successMessage = true; // Simulate successful activation
    }

    res.render('activation', {
        successMessage: successMessage,
        errorMessage: errorMessage,
        activationToken: activationToken
    });
});

// Example Route for Login Handling
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    let username_err = '';
    let password_err = '';

    // Validate the username and password inputs
    if (!username) {
        username_err = "Username is required";
    }
    if (!password) {
        password_err = "Password is required";
    }

    // If there are errors, return to login page with error messages
    if (username_err || password_err) {
        return res.render('auth/login', {
            username_err,
            password_err,
            username,
            login_err: "Please fix the errors and try again"
        });
    }

    // Perform login validation (dummy example)
    if (username === "user" && password === "password") {
        // Redirect to dashboard if login is successful
        res.redirect('/dashboard');
    } else {
        // Pass the error message if login fails
        res.render('auth/login', {
            login_err: "Invalid username or password",
            username
        });
    }
});

// Example route to handle logout
app.post('/logout', (req, res) => {
    // Clear the session or token
    res.clearCookie('token'); // Clear the token cookie (if stored in cookies)
    // Redirect to the login page
    res.redirect('/auth/login');
});

// PayPal Payment Example
app.post('/create-payment', verifyToken, async (req, res) => {
    const order = {
        intent: 'CAPTURE',
        purchase_units: [
            { amount: { value: req.body.amount } },
        ],
        application_context: {
            return_url: 'http://localhost:5000/payment-success',
            cancel_url: 'http://localhost:5000/payment-cancel',
        },
    };

    const request = new paypalClient.orders.OrdersCreateRequest();
    request.requestBody(order);

    try {
        const orderResponse = await paypalClient.execute(request);
        res.json({ orderId: orderResponse.result.id });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Payment creation failed' });
    }
});

// Import routes
const authRoutes = require('./routes/authRoute');
const dashboardRoutes = require('./routes/dashboardRoute');
const supplierRoutes = require('./routes/supplierRoute');
const invoiceRoutes = require('./routes/invoiceRoute');
const salesRoutes = require('./routes/salesRoute');
const categoryReportRoutes = require('./routes/category-reportRoute');
const productReportRoutes = require('./routes/product-reportRoute');
const productRoutes = require('./routes/productRoute');
const chartRoutes = require('./routes/chartRoute');
const chartReportRoutes = require('./routes/chart-reportRoute');
const categoryRoutes = require('./routes/categoryRoute');
const customerRoutes = require('./routes/customerRoute');
const expenseRoutes = require('./routes/expenseRoute');
const inventoryRoutes = require('./routes/inventoryRoute');
const notificationRoutes = require('./routes/notificationRoute');
const pageAccessRoutes = require('./routes/page-accessRoute');
const payRoutes = require('./routes/payRoute');
const profileRoutes = require('./routes/profileRoute');
const staffRoutes = require('./routes/staffRoute');
const subscriptionRoutes = require('./routes/subscriptionRoute');
const pdfRoute = require('./routes/pdfRoute');

// Use routes
app.use('/auth', authRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/supplier', supplierRoutes);
app.use('/invoice', invoiceRoutes);
app.use('/sales', salesRoutes);
app.use('/category-report', categoryReportRoutes);
app.use('/product-report', productReportRoutes);
app.use('/product', productRoutes);
app.use('/chart', chartRoutes);
app.use('/chart-report', chartReportRoutes);
app.use('/category', categoryRoutes);
app.use('/customer', customerRoutes);
app.use('/expense', expenseRoutes);
app.use('/inventory', inventoryRoutes);
app.use('/notification', notificationRoutes);
app.use('/page-access', pageAccessRoutes);
app.use('/pay', payRoutes);
app.use('/profile', profileRoutes);
app.use('/staff', staffRoutes);
app.use('/subscription', subscriptionRoutes);
app.use('/pdf', pdfRoute);

// Default Route for Undefined Paths
app.use((req, res) => {
    res.status(404).json({ message: 'Route not found' });
});

// Global Error Handler
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({ message: 'Internal Server Error', error: err.message });
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

module.exports = app;

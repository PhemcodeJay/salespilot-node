require('dotenv').config(); // Load environment variables from .env file
const express = require('express');
const mysql = require('mysql2');
const path = require('path');
const session = require('express-session');
const bodyParser = require('body-parser');
const passport = require('passport');
const bcrypt = require('bcryptjs'); // For password hashing
const { generateToken, verifyToken } = require('./config/auth'); // JWT helper
const openai = require('openai'); // Assuming OpenAI SDK or API for tenant use cases
const paypalClient = require('./config/paypalconfig'); // PayPal client configuration
require('./config/passport')(passport); // Passport configuration

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
const sessionConfig = session({
    secret: process.env.SESSION_SECRET || 'your-secret-key', // Use a strong secret key
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // Set to true if using HTTPS
});
app.use(sessionConfig); // Apply session configuration globally

// OpenAI Configuration (for tenancy management)
const openaiClient = new openai.OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    organizationId: process.env.OPENAI_ORG_ID,
});

// Serve Static Files and HTML Pages
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/dashboard', (req, res) => res.sendFile(path.join(__dirname, 'public', 'dashboard.html')));

// Import and Use Routes
const routes = {
    dashboard: require('./routes/dashboardRoute'),
    supplier: require('./routes/supplierRoute'),
    invoice: require('./routes/invoiceRoute'),
    sales: require('./routes/salesRoute'),
    categoryReport: require('./routes/category-reportRoute'),
    productReport: require('./routes/product-reportRoute'),
    product: require('./routes/productRoute'),
    chart: require('./routes/chartRoute'),
    chartReport: require('./routes/chart-reportRoute'),
    auth: require('./routes/authRoute'),
    category: require('./routes/categoryRoute'),
    customer: require('./routes/customerRoute'),
    expense: require('./routes/expenseRoute'),
    inventory: require('./routes/inventoryRoute'),
    notification: require('./routes/notificationRoute'),
    pageAccess: require('./routes/page-accessRoute'),
    pay: require('./routes/payRoute'),
    profile: require('./routes/profileRoute'),
    staff: require('./routes/staffRoute'),
    subscription: require('./routes/subscriptionRoute'),
    paypal: require('./config/paypalconfig'), // Adjusted to correct import path
    pdfRoute: require('./routes/pdfRoute'), // Ensure pdfRoute is imported here
};



// JWT Authentication Example Routes
app.post('/login', (req, res) => {
    const { email, password } = req.body;
    const user = { id: 1, email }; // Replace with your user validation logic

    if (email === 'user@example.com' && password === 'password123') {
        const token = generateToken(user); // Generate JWT
        return res.json({ token });
    }
    res.status(401).json({ error: 'Invalid credentials.' });
});

app.get('/profile', verifyToken, (req, res) => {
    res.json({ user: req.user });
});

// PayPal Payment Example
app.post('/create-payment', verifyToken, async (req, res) => {
    const order = {
        intent: 'CAPTURE',
        purchase_units: [
            { amount: { value: req.body.amount } }
        ],
        application_context: {
            return_url: 'http://localhost:3000/payment-success',
            cancel_url: 'http://localhost:3000/payment-cancel',
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

// Import Cron Jobs
require('./cron/subscriptioncron');

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

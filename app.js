const express = require('express');
const path = require('path');
const mysql = require('mysql2/promise');
const session = require('express-session');
const bodyParser = require('body-parser');
const passport = require('passport');
const bcrypt = require('./utils/bcryptUtils.js');
const { generateToken, verifyToken } = require('./config/auth');
const openai = require('./config/openaiconfig');
const paypalClient = require('./config/paypalconfig');
require('dotenv').config();
require('./config/passport')(passport);
const flash = require('connect-flash');
const cookieParser = require('cookie-parser');

// Import the Punycode module
const punycode = require('punycode/');

// Encode a string (localhost example) to Punycode
const encoded = punycode.toASCII('localhost');
console.log('Encoded:', encoded); // Should print 'localhost' as it doesn't require encoding

// Decode a Punycode string back to Unicode
const decoded = punycode.toUnicode('localhost');
console.log('Decoded:', decoded); // Should print 'localhost' as it doesn't require decoding


// Initialize Express App
const app = express();

app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: true
}));
app.use(flash());

// Set View Engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware Setup
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(
    session({
        secret: process.env.SESSION_SECRET || 'your-secret-key',
        resave: false,
        saveUninitialized: true,
        cookie: { secure: false }, // Set to true if using HTTPS
    })
);
app.use(passport.initialize());
app.use(passport.session());
app.use(cookieParser());



// Serve Static Files
app.use('/assets', express.static(path.join(__dirname, 'public', 'assets')));
app.use('/home_assets', express.static(path.join(__dirname, 'public', 'home_assets')));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views')); // Ensure the 'views' folder path is correct


// Routes to Serve Views
app.get('/', (req, res) => {
    res.render('home/index', { title: 'Home' });
});


// PayPal Payment Example
app.post('/create-payment', verifyToken, async (req, res) => {
    const order = {
        intent: 'CAPTURE',
        purchase_units: [{ amount: { value: req.body.amount } }],
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

// Import and Attach Additional Routes
const routes = {
    auth: require('./routes/authRoute'),
    dashboard: require('./routes/dashboardRoute'),
    supplier: require('./routes/supplierRoute'),
    invoice: require('./routes/invoiceRoute'),
    sales: require('./routes/salesRoute'),
    categoryReport: require('./routes/category-reportRoute'),
    productReport: require('./routes/product-reportRoute'),
    product: require('./routes/productRoute'),
    chart: require('./routes/chartRoute'),
    chartReport: require('./routes/chart-reportRoute'),
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
    pdfRoute: require('./routes/pdfRoute'),
};

app.use('/auth', routes.auth);
Object.entries(routes).forEach(([name, route]) => {
    if (name !== 'auth') app.use(`/${name}`, route);
});

// Cron Jobs
require('./cron/subscriptioncron');

// Error Handling
app.use((req, res) => {
    res.status(404).json({ message: 'Route not found' });
});

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

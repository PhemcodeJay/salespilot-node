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
const flash = require('connect-flash'); // For flash messages

// Initialize Express App
const app = express();

// Set up view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(express.static(path.join(__dirname, 'public'))); // Static files (CSS, JS, Images)
app.use(bodyParser.urlencoded({ extended: false })); // Parse form data
app.use(bodyParser.json()); // Parse JSON data

// Session Configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'defaultsecret',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false, httpOnly: true, maxAge: 3600000 } // 1 hour session
}));

// Flash messages middleware
app.use(flash());

// CSRF protection middleware
const csrfProtection = csrf({ cookie: true });
app.use(csrfProtection);

// Initialize Passport and session
app.use(passport.initialize());
app.use(passport.session());

// Database Connection
const db = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'dbs13455438'
});

// OpenAI client setup (Optional)
const openAIClient = new openai.OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// PayPal client configuration (Optional)
const paypal = paypalClient;

// Global route handlers (for views or actions)

// Home Route (Landing page or dashboard)
app.get('/', (req, res) => {
    res.render('index', {
        csrfToken: req.csrfToken(), // CSRF token for security
        user: req.user || null // User data if logged in
    });
});

// Auth Routes (Login, Signup, etc.)
const authRoutes = require('./routes/authRoute');
app.use(authRoutes);

// Example of protected route
app.get('/dashboard', verifyToken, (req, res) => {
    res.render('dashboard', { user: req.user });
});

// Example of an openai interaction
app.post('/openai', async (req, res) => {
    try {
        const { prompt } = req.body;
        const response = await openAIClient.completions.create({
            model: 'text-davinci-003',
            prompt: prompt,
            max_tokens: 100,
        });
        res.json({ response: response.choices[0].text });
    } catch (error) {
        res.status(500).json({ error: 'Failed to interact with OpenAI' });
    }
});

// PayPal payment example route
app.post('/paypal/payment', async (req, res) => {
    const paymentData = req.body; // Process payment data from form submission
    try {
        const payment = await paypal.payment.create(paymentData);
        res.json({ payment });
    } catch (error) {
        res.status(500).json({ error: 'Failed to process PayPal payment' });
    }
});

// Error Handling (404 and others)
app.use((req, res, next) => {
    res.status(404).render('404'); // Render a 404 page
});

// General Error Handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something went wrong!');
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

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
const flash = require('connect-flash');

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

// Flash middleware must be used before routes
app.use(flash());

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

// Login route (Render Login Page)
app.get('/auth/login', (req, res) => {
    if (req.isAuthenticated()) {
        // Redirect to the dashboard if already logged in
        return res.redirect('/dashboard');
    }
    res.render('auth/login', {
        login_err: req.flash('login_err'), // Assuming you're using flash messages
        username: req.flash('username'),
        username_err: req.flash('username_err')
    });
});

// Signup route (Handle Signup Logic)
app.post('/auth/signup', (req, res) => {
    const { username, email, password } = req.body;
    let errorMessage = '';

    if (!username || !email || !password) {
        errorMessage = 'All fields are required.';
        return res.render('auth/signup', { errorMessage });
    }

    bcrypt.hash(password, 10, (err, hashedPassword) => {
        if (err) {
            return res.status(500).send('Error hashing password');
        }

        const query = 'INSERT INTO users (username, email, password) VALUES (?, ?, ?)';
        db.query(query, [username, email, hashedPassword], (err, results) => {
            if (err) {
                return res.status(500).send('Error saving user');
            }

            // Send activation email here (example placeholder)
            res.redirect('/activate');
        });
    });
});

// Activation route (Handle Account Activation)
app.get('/activate', (req, res) => {
    const activationToken = req.query.token;
    if (activationToken) {
        // Here you would verify the token and activate the user's account
        res.render('activation', { successMessage: 'Account activated successfully' });
    } else {
        res.render('activation', { errorMessage: 'Invalid or missing activation token' });
    }
});

// Dashboard Route (Protected with Authentication Check)
app.get('/dashboard', (req, res) => {
    if (!req.isAuthenticated()) {
        return res.redirect('/auth/login'); // Redirect to login if not authenticated
    }
    res.render('dashboard');
});


// Logout Route (Handle Logout Logic)
app.get('/logout', (req, res) => {
    req.logout((err) => {
        if (err) {
            return next(err);
        }
        res.redirect('/auth/login'); // Redirect to login after logout
    });
});

// Import routes
const authRoutes = require('./routes/authRoute');
const dashboardRoutes = require('./routes/dashboardRoute');

// Use routes
app.use('/auth', authRoutes);
app.use('/dashboard', dashboardRoutes);

// Default Route for Undefined Paths
app.use((req, res) => {
    res.status(404).json({ message: 'Route not found' });
});

// Global Error Handler
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({ message: 'Internal Server Error', error: err.message });
});

// Flash middleware - must be used after session setup and before routes
app.use((req, res, next) => {
  res.locals.success_msg = req.flash('success_msg');
  res.locals.error_msg = req.flash('error_msg');
  res.locals.error = req.flash('error');
  next();
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

module.exports = app;

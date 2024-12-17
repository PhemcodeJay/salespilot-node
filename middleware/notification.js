require('dotenv').config(); // Load environment variables
const mysql = require('mysql2');
const jwt = require('jsonwebtoken');
const fetch = require('node-fetch');

// MySQL connection pool setup
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'dbs13455438',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
});

// JWT token verification middleware
const verifyTokenMiddleware = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return res.status(403).send('Token is required');
    
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // Attach user information to the request object
        next();
    } catch (err) {
        console.error('Token verification error:', err.message);
        res.status(401).send('Invalid token');
    }
};

// Fetch user details by token middleware
const fetchUserInfoMiddleware = async (req, res, next) => {
    const { username } = req.user; // Access user data from the decoded JWT token
    try {
        const query = `
            SELECT username, email, date, phone, location, user_image
            FROM users
            WHERE username = ?
        `;
        pool.query(query, [username], (err, results) => {
            if (err) {
                console.error('SQL Error:', err.message);
                return res.status(500).send('Database query error');
            }
            if (results.length === 0) return res.status(404).send('User not found');
            req.userInfo = results[0]; // Attach user information to the request object
            next();
        });
    } catch (err) {
        console.error('Error fetching user info:', err.message);
        res.status(500).send('Error fetching user info');
    }
};

// Generic notification fetch function middleware
const fetchNotificationsMiddleware = async (req, res, next) => {
    const { route } = req.params; // Route passed in URL to fetch specific notifications
    try {
        const response = await fetch(route, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const notifications = await response.json();
        req.notifications = notifications; // Attach notifications to the request object
        next();
    } catch (error) {
        console.error(`Error fetching notifications from ${route}:`, error.message);
        res.status(500).send('Error fetching notifications');
    }
};

// Specific notification middleware functions
const fetchInventoryNotificationsMiddleware = (req, res, next) => {
    req.params.route = '/notifications/inventory';
    fetchNotificationsMiddleware(req, res, next);
};

const fetchReportsNotificationsMiddleware = (req, res, next) => {
    req.params.route = '/notifications/reports';
    fetchNotificationsMiddleware(req, res, next);
};

const fetchSalesNotificationsMiddleware = (req, res, next) => {
    req.params.route = '/notifications/sales';
    fetchNotificationsMiddleware(req, res, next);
};

const fetchCustomerNotificationsMiddleware = (req, res, next) => {
    req.params.route = '/notifications/customers';
    fetchNotificationsMiddleware(req, res, next);
};

// Exporting functions for use in routes or other parts of the application
module.exports = {
    verifyTokenMiddleware,
    fetchUserInfoMiddleware,
    fetchInventoryNotificationsMiddleware,
    fetchReportsNotificationsMiddleware,
    fetchSalesNotificationsMiddleware,
    fetchCustomerNotificationsMiddleware,
};

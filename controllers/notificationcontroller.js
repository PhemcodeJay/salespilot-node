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

// JWT token verification function
const verifyToken = (token) => {
    try {
        return jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
        console.error('Token verification error:', err.message);
        return null;
    }
};

// Fetch user details by token
const fetchUserInfo = (username) => {
    return new Promise((resolve, reject) => {
        const query = `
            SELECT username, email, date, phone, location, user_image
            FROM users
            WHERE username = ?
        `;
        pool.query(query, [username], (err, results) => {
            if (err) {
                console.error('SQL Error:', err.message);
                return reject('Database query error');
            }
            if (results.length === 0) return reject('User not found');
            resolve(results[0]);
        });
    });
};

// Generic notification fetch function
const fetchNotifications = async (route) => {
    try {
        const response = await fetch(route, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const notifications = await response.json();
        console.log(`Notifications from ${route}:`, notifications);
        return notifications;
    } catch (error) {
        console.error(`Error fetching notifications from ${route}:`, error.message);
    }
};

// Specific notification functions
const fetchInventoryNotifications = async () => await fetchNotifications('/notifications/inventory');
const fetchReportsNotifications = async () => await fetchNotifications('/notifications/reports');
const fetchSalesNotifications = async () => await fetchNotifications('/notifications/sales');
const fetchCustomerNotifications = async () => await fetchNotifications('/notifications/customers');
const fetchOtherNotifications = async (route) => await fetchNotifications(route);

// Exporting functions for use in routes or other parts of the application
module.exports = {
    verifyToken,
    fetchUserInfo,
    fetchInventoryNotifications,
    fetchReportsNotifications,
    fetchSalesNotifications,
    fetchCustomerNotifications,
    fetchOtherNotifications,
};

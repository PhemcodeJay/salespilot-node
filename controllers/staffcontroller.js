const express = require('express');
const mysql = require('mysql2');
const session = require('express-session');
const PDFDocument = require('pdfkit');
const path = require('path');
const jwt = require('jsonwebtoken'); // Added for JWT functionality
const app = express();

// MySQL connection pool setup
const pool = mysql.createPool({
    host: 'localhost',
    user: 'root', // Replace with actual DB username
    password: '', // Replace with actual DB password
    database: 'dbs13455438',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Use express-session for session handling
app.use(session({
    secret: 'your_secret_key',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }  // Set to false for development (ensure HTTPS for production)
}));

// JWT token verification function
const verifyToken = (token) => {
    try {
        return jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
        return null;
    }
};

// Fetch user details by token
const fetchUserInfo = (username) => {
    return new Promise((resolve, reject) => {
        pool.query('SELECT username, email, date, phone, location, user_image FROM users WHERE username = ?', [username], (err, results) => {
            if (err) return reject("Error fetching user info");
            if (results.length === 0) return reject("User not found.");
            resolve(results[0]);
        });
    });
};

// Configure body parser middleware to parse POST data
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Fetch inventory and report notifications with product images
app.get('/notifications', (req, res) => {
    if (!req.session.username) {
        return res.status(401).send('No username found in session.');
    }

    const inventoryQuery = `
        SELECT i.product_name, i.available_stock, i.inventory_qty, i.sales_qty, p.image_path
        FROM inventory i
        JOIN products p ON i.product_id = p.id
        WHERE i.available_stock < ? OR i.available_stock > ?
        ORDER BY i.last_updated DESC
    `;
    pool.query(inventoryQuery, [10, 1000], (err, inventoryNotifications) => {
        if (err) return res.status(500).send(err.message);

        const reportsQuery = `
            SELECT JSON_UNQUOTE(JSON_EXTRACT(revenue_by_product, '$.product_name')) AS product_name, 
                   JSON_UNQUOTE(JSON_EXTRACT(revenue_by_product, '$.revenue')) AS revenue,
                   p.image_path
            FROM reports r
            JOIN products p ON JSON_UNQUOTE(JSON_EXTRACT(revenue_by_product, '$.product_id')) = p.id
            WHERE JSON_UNQUOTE(JSON_EXTRACT(revenue_by_product, '$.revenue')) > ? 
               OR JSON_UNQUOTE(JSON_EXTRACT(revenue_by_product, '$.revenue')) < ?
            ORDER BY r.report_date DESC
        `;
        pool.query(reportsQuery, [10000, 1000], (err, reportsNotifications) => {
            if (err) return res.status(500).send(err.message);
            
            res.json({ inventoryNotifications, reportsNotifications });
        });
    });
});

// Fetch user info and update session data
app.get('/user-info', (req, res) => {
    if (!req.session.username) {
        return res.status(401).send('No username found in session.');
    }

    const query = "SELECT username, email, date FROM users WHERE username = ?";
    pool.query(query, [req.session.username], (err, user_info) => {
        if (err) return res.status(500).send(err.message);
        if (!user_info.length) return res.status(404).send('User not found.');

        res.json(user_info[0]);
    });
});

// Handle POST form actions: Add or update staff, or delete staff
app.post('/staff', (req, res) => {
    if (!req.session.username) {
        return res.status(401).send('No username found in session.');
    }

    const { staff_name, staff_email, staff_phone, position, action, staff_id } = req.body;

    if (action === 'update' || action === 'insert') {
        const query = action === 'update' 
            ? "UPDATE staffs SET staff_name = ?, staff_email = ?, staff_phone = ?, position = ? WHERE staff_id = ?"
            : "INSERT INTO staffs (staff_name, staff_email, staff_phone, position) VALUES (?, ?, ?, ?)";

        const params = action === 'update' 
            ? [staff_name, staff_email, staff_phone, position, staff_id] 
            : [staff_name, staff_email, staff_phone, position];

        pool.query(query, params, (err, result) => {
            if (err) return res.status(500).send(err.message);
            res.redirect('/page-list-staffs');
        });
    }

    // Handle delete action
    if (action === 'delete') {
        if (!staff_id) return res.status(400).send('Staff ID is required for deletion.');
        
        const deleteQuery = "DELETE FROM staffs WHERE staff_id = ?";
        pool.query(deleteQuery, [staff_id], (err, result) => {
            if (err) return res.status(500).send(err.message);
            res.json({ success: 'Staff deleted' });
        });
    }
});

// Generate and download staff PDF
app.post('/generate-pdf', (req, res) => {
    const { staff_id } = req.body;

    if (!staff_id) {
        return res.status(400).send('Staff ID is required for generating PDF.');
    }

    const query = "SELECT * FROM staffs WHERE staff_id = ?";
    pool.query(query, [staff_id], (err, staff) => {
        if (err) return res.status(500).send(err.message);
        if (!staff.length) return res.status(404).send('Staff not found.');

        const doc = new PDFDocument();
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=staff_${staff_id}.pdf`);
        
        doc.pipe(res);
        doc.fontSize(16).text('Staff Details');
        doc.fontSize(12).text(`Staff Name: ${staff[0].staff_name}`);
        doc.text(`Staff Email: ${staff[0].staff_email}`);
        doc.text(`Staff Phone: ${staff[0].staff_phone}`);
        doc.text(`Position: ${staff[0].position}`);
        
        doc.end();
    });
});

// Start the Express server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

// Export functions for modularity
module.exports = {
    fetchUserInfo,
    addOrUpdateStaff,
    deleteStaff,
    generateStaffPDF
};

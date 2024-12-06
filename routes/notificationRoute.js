const express = require('express');
const router = express.Router();
const mysql = require('mysql2');

// Setup MySQL connection
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'your_database',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
});

// Helper function to execute database queries
const executeQuery = (query, params, res) => {
    pool.query(query, params, (err, results) => {
        if (err) {
            console.error('Database Query Error:', err.message);
            return res.status(500).json({ error: 'Database query error', details: err.message });
        }
        res.json(results);
    });
};

// Route to fetch inventory notifications
router.get('/inventory', (req, res) => {
    const lowStock = 10;
    const highStock = 1000;

    const query = `
        SELECT i.product_name, i.available_stock, i.inventory_qty, i.sales_qty, p.image_path
        FROM inventory i
        JOIN products p ON i.product_id = p.id
        WHERE i.available_stock < ? OR i.available_stock > ?
        ORDER BY i.last_updated DESC
    `;

    executeQuery(query, [lowStock, highStock], res);
});

// Route to fetch report notifications
router.get('/reports', (req, res) => {
    const highRevenue = 10000;
    const lowRevenue = 1000;

    const query = `
        SELECT JSON_UNQUOTE(JSON_EXTRACT(revenue_by_product, '$.product_name')) AS product_name, 
               JSON_UNQUOTE(JSON_EXTRACT(revenue_by_product, '$.revenue')) AS revenue,
               p.image_path
        FROM reports r
        JOIN products p ON JSON_UNQUOTE(JSON_EXTRACT(revenue_by_product, '$.product_id')) = p.id
        WHERE JSON_UNQUOTE(JSON_EXTRACT(revenue_by_product, '$.revenue')) > ? 
           OR JSON_UNQUOTE(JSON_EXTRACT(revenue_by_product, '$.revenue')) < ?
        ORDER BY r.report_date DESC
    `;

    executeQuery(query, [highRevenue, lowRevenue], res);
});

// Route to fetch sales notifications
router.get('/sales', (req, res) => {
    const highSales = 500;
    const lowSales = 10;

    const query = `
        SELECT s.sale_id, p.product_name, s.sale_qty, s.sale_price, p.image_path
        FROM sales s
        JOIN products p ON s.product_id = p.id
        WHERE s.sale_qty > ? OR s.sale_qty < ?
        ORDER BY s.sale_date DESC
    `;

    executeQuery(query, [lowSales, highSales], res);
});

// Route to fetch customer notifications
router.get('/customers', (req, res) => {
    const newCustomerThreshold = 100;

    const query = `
        SELECT c.customer_name, c.email, c.purchase_history, p.image_path
        FROM customers c
        JOIN products p ON c.favored_product_id = p.id
        WHERE c.purchase_history > ?
        ORDER BY c.registration_date DESC
    `;

    executeQuery(query, [newCustomerThreshold], res);
});

// Route to fetch notifications for any other categories dynamically
router.get('/:category', (req, res) => {
    const category = req.params.category;

    // Validate category name to prevent SQL injection
    if (!['inventory', 'reports', 'sales', 'customers'].includes(category)) {
        return res.status(400).json({ error: 'Invalid category' });
    }

    const query = `SELECT * FROM ?? WHERE notification_flag = 1`;

    executeQuery(query, [category], res);
});

module.exports = router;

const express = require('express');
const router = express.Router();
const mysql = require('mysql');

// Setup MySQL connection
const connection = mysql.createConnection({
    host: 'your_host',
    user: 'your_user',
    password: 'your_password',
    database: 'your_database',
});

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
    
    connection.query(query, [lowStock, highStock], (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(results);
    });
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
    
    connection.query(query, [highRevenue, lowRevenue], (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(results);
    });
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
    
    connection.query(query, [lowSales, highSales], (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(results);
    });
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
    
    connection.query(query, [newCustomerThreshold], (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(results);
    });
});

// Route to fetch notifications for any other categories dynamically
router.get('/:category', (req, res) => {
    const category = req.params.category;
    const query = `
        SELECT * FROM ${category} WHERE notification_flag = 1
    `;

    connection.query(query, (err, results) => {
        if (err) {
            return res.status(500).json({ error: `Error fetching notifications for ${category}: ${err.message}` });
        }
        res.json(results);
    });
});

module.exports = router;

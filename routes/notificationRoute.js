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

module.exports = router;

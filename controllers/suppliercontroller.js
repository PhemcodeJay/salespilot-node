const express = require('express');
const mysql = require('mysql2');
const session = require('express-session');
const path = require('path');
const fs = require('fs');
const PDF = require('pdfkit'); // PDF generation
const jwt = require('jsonwebtoken');
const userModel = require('../models/user');
const supplierModel = require('../models/supplier');

const router = express.Router();

// MySQL connection setup
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
});

// MySQL connection pool setup
const pool = mysql.createPool({
    host: 'localhost',
    user: 'root', // Replace with actual DB username
    password: '', // Replace with actual DB password
    database: 'dbs13455438',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
});

// JWT token verification function
const verifyToken = (token) => {
    try {
        return jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
        return null;
    }
};

// Middleware to check if the user is logged in
const checkLogin = (req, res, next) => {
    if (!req.session.username) {
        return res.status(401).json({ message: "User not logged in" });
    }
    next();
};

// Middleware to sanitize user input
const sanitizeInput = (input) => {
    return input.replace(/[^a-zA-Z0-9 ]/g, "");
};

// Fetch Inventory and Reports Notifications
router.get('/notifications', (req, res) => {
    try {
        // Inventory Notifications
        db.query(`
            SELECT i.product_name, i.available_stock, i.inventory_qty, i.sales_qty, p.image_path
            FROM inventory i
            JOIN products p ON i.product_id = p.id
            WHERE i.available_stock < ? OR i.available_stock > ?
            ORDER BY i.last_updated DESC`, [10, 1000], (err, inventoryNotifications) => {
            if (err) return res.status(500).json({ message: 'Database error', error: err });

            // Reports Notifications
            db.query(`
                SELECT JSON_UNQUOTE(JSON_EXTRACT(revenue_by_product, '$.product_name')) AS product_name, 
                JSON_UNQUOTE(JSON_EXTRACT(revenue_by_product, '$.revenue')) AS revenue,
                p.image_path
                FROM reports r
                JOIN products p ON JSON_UNQUOTE(JSON_EXTRACT(revenue_by_product, '$.product_id')) = p.id
                WHERE JSON_UNQUOTE(JSON_EXTRACT(revenue_by_product, '$.revenue')) > ? 
                OR JSON_UNQUOTE(JSON_EXTRACT(revenue_by_product, '$.revenue')) < ?
                ORDER BY r.report_date DESC`, [10000, 1000], (err, reportsNotifications) => {

                if (err) return res.status(500).json({ message: 'Database error', error: err });

                res.json({ inventoryNotifications, reportsNotifications });
            });
        });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err });
    }
});

// Fetch All Suppliers
router.get('/suppliers', checkLogin, (req, res) => {
    db.query('SELECT * FROM suppliers', (err, results) => {
        if (err) return res.status(500).json({ message: 'Database error', error: err });
        res.json(results);
    });
});

// Fetch Single Supplier
router.get('/suppliers/:supplier_id', checkLogin, (req, res) => {
    const supplier_id = req.params.supplier_id;
    db.query('SELECT * FROM suppliers WHERE supplier_id = ?', [supplier_id], (err, results) => {
        if (err) return res.status(500).json({ message: 'Database error', error: err });
        if (results.length === 0) return res.status(404).json({ message: 'Supplier not found' });
        res.json(results[0]);
    });
});

// Create New Supplier
router.post('/suppliers', checkLogin, (req, res) => {
    const { supplier_name, product_name, supplier_email, supplier_phone, supplier_location, note, supply_qty } = req.body;

    if (!supplier_name || !product_name || !supply_qty) {
        return res.status(400).json({ message: 'Supplier name, product name, and supply quantity are required.' });
    }

    db.query(`
        INSERT INTO suppliers (supplier_name, product_name, supplier_email, supplier_phone, supplier_location, note, supply_qty)
        VALUES (?, ?, ?, ?, ?, ?, ?)`, 
        [supplier_name, product_name, supplier_email, supplier_phone, supplier_location, note, supply_qty], 
        (err, result) => {
            if (err) return res.status(500).json({ message: 'Error inserting supplier', error: err });
            res.status(201).json({ message: 'Supplier added successfully', supplier_id: result.insertId });
        }
    );
});

// Update Supplier Information
router.put('/suppliers/:supplier_id', checkLogin, (req, res) => {
    const { supplier_name, product_name, supplier_email, supplier_phone, supplier_location, note, supply_qty } = req.body;
    const supplier_id = req.params.supplier_id;

    if (!supplier_name || !product_name || !supply_qty) {
        return res.status(400).json({ message: 'All fields are required.' });
    }

    db.query(`
        UPDATE suppliers 
        SET supplier_name = ?, product_name = ?, supplier_email = ?, supplier_phone = ?, supplier_location = ?, note = ?, supply_qty = ?
        WHERE supplier_id = ?`, 
        [supplier_name, product_name, supplier_email, supplier_phone, supplier_location, note, supply_qty, supplier_id], 
        (err, result) => {
            if (err) return res.status(500).json({ message: 'Error updating supplier', error: err });
            res.json({ message: 'Supplier updated successfully' });
        }
    );
});

// Delete Supplier
router.delete('/suppliers/:supplier_id', checkLogin, (req, res) => {
    const supplier_id = req.params.supplier_id;
    db.query('DELETE FROM suppliers WHERE supplier_id = ?', [supplier_id], (err, result) => {
        if (err) return res.status(500).json({ message: 'Error deleting supplier', error: err });
        res.json({ message: 'Supplier deleted successfully' });
    });
});

// Generate PDF for Supplier
router.get('/suppliers/pdf/:supplier_id', checkLogin, (req, res) => {
    const supplier_id = req.params.supplier_id;

    db.query('SELECT * FROM suppliers WHERE supplier_id = ?', [supplier_id], (err, supplier) => {
        if (err) return res.status(500).json({ message: 'Error fetching supplier details', error: err });
        if (!supplier || supplier.length === 0) {
            return res.status(404).json({ message: 'Supplier not found' });
        }

        const supplierData = supplier[0];
        const pdf = new FPDF();
        pdf.addPage();
        pdf.setFont('Arial', 'B', 16);
        pdf.cell(40, 10, 'Supplier Details');
        pdf.ln();
        pdf.setFont('Arial', '', 12);
        pdf.cell(40, 10, `Name: ${supplierData.supplier_name}`);
        pdf.ln();
        pdf.cell(40, 10, `Email: ${supplierData.supplier_email}`);
        pdf.ln();
        pdf.cell(40, 10, `Phone: ${supplierData.supplier_phone}`);
        pdf.ln();
        pdf.cell(40, 10, `Location: ${supplierData.supplier_location}`);
        
        pdf.output('D', `supplier_${supplier_id}.pdf`);
    });
});

module.exports = router;

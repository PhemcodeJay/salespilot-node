const express = require('express');
const mysql = require('mysql2');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const { json } = require('body-parser');
const path = require('path');
const fs = require('fs');
const FPDF = require('fpdf'); // PDF generation

const router = express.Router();

// Database Connection
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'salespilot'
});

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

// Fetch User Information
router.get('/user', checkLogin, (req, res) => {
    const username = sanitizeInput(req.session.username);

    db.query(`SELECT username, email, date FROM users WHERE username = ?`, [username], (err, user_info) => {
        if (err) return res.status(500).json({ message: 'Database error', error: err });
        
        if (user_info.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        const { email, date } = user_info[0];
        res.json({ email, date });
    });
});

// Handle Supplier Insert and Update
router.post('/supplier', checkLogin, (req, res) => {
    const { supplier_name, product_name, supplier_email, supplier_phone, supplier_location, note, supply_qty } = req.body;

    if (!supplier_name || !product_name || !supply_qty) {
        return res.status(400).json({ message: 'Supplier name, product name, and supply quantity are required.' });
    }

    db.query(`
        INSERT INTO suppliers (supplier_name, product_name, supplier_email, supplier_phone, supplier_location, note, supply_qty)
        VALUES (?, ?, ?, ?, ?, ?, ?)`, [supplier_name, product_name, supplier_email, supplier_phone, supplier_location, note, supply_qty], (err, result) => {
        
        if (err) return res.status(500).json({ message: 'Error inserting supplier', error: err });
        
        res.status(201).json({ message: 'Supplier added successfully' });
    });
});

// Handle Supplier Update and Delete Actions
router.post('/supplier/action', checkLogin, (req, res) => {
    const { action, supplier_id, supplier_name, supplier_email, supplier_phone, supplier_location } = req.body;

    if (!action || !supplier_id) {
        return res.status(400).json({ message: 'Action and Supplier ID are required.' });
    }

    if (action === 'delete') {
        db.query(`DELETE FROM suppliers WHERE supplier_id = ?`, [supplier_id], (err, result) => {
            if (err) return res.status(500).json({ message: 'Error deleting supplier', error: err });
            
            res.json({ success: true, message: 'Supplier deleted successfully' });
        });
    } else if (action === 'update') {
        if (!supplier_name || !supplier_email || !supplier_phone || !supplier_location) {
            return res.status(400).json({ message: 'All supplier fields are required to update.' });
        }

        db.query(`
            UPDATE suppliers 
            SET supplier_name = ?, supplier_email = ?, supplier_phone = ?, supplier_location = ?
            WHERE supplier_id = ?`, 
            [supplier_name, supplier_email, supplier_phone, supplier_location, supplier_id], (err, result) => {
            
            if (err) return res.status(500).json({ message: 'Error updating supplier', error: err });
            
            res.json({ success: true, message: 'Supplier updated successfully' });
        });
    } else {
        res.status(400).json({ message: 'Invalid action' });
    }
});

// Generate PDF for Supplier
router.get('/supplier/pdf/:supplier_id', checkLogin, (req, res) => {
    const supplier_id = req.params.supplier_id;

    db.query(`SELECT * FROM suppliers WHERE supplier_id = ?`, [supplier_id], (err, supplier) => {
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

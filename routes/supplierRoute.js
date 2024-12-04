const express = require('express');
const mysql = require('mysql2');
const pdfkit = require('pdfkit'); // PDF generation

const router = express.Router();

// MySQL connection setup
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
});

// Middleware to check if the user is logged in
const checkLogin = (req, res, next) => {
    if (!req.session.username) {
        return res.status(401).json({ message: "User not logged in" });
    }
    next();
};

// Handle Supplier Insert
router.post('/supplier', checkLogin, (req, res) => {
    const { supplier_name, product_name, supplier_email, supplier_phone, supplier_location, note, supply_qty } = req.body;

    if (!supplier_name || !product_name || !supply_qty) {
        return res.status(400).json({ message: 'Supplier name, product name, and supply quantity are required.' });
    }

    db.query(`
        INSERT INTO suppliers (supplier_name, product_name, supplier_email, supplier_phone, supplier_location, note, supply_qty)
        VALUES (?, ?, ?, ?, ?, ?, ?)`, 
        [supplier_name, product_name, supplier_email, supplier_phone, supplier_location, note, supply_qty], (err, result) => {
        
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
        const pdf = new pdfkit();
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

// Fetch Supplier List
router.get('/suppliers', checkLogin, (req, res) => {
    db.query('SELECT * FROM suppliers', (err, suppliers) => {
        if (err) return res.status(500).json({ message: 'Error fetching suppliers', error: err });

        res.json({ suppliers });
    });
});

module.exports = router;

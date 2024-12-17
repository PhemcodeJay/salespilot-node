const express = require('express');
const pdfkit = require('pdfkit');
const supplierController = require('../controllers/suppliercontroller');
const authController = require('../controllers/authcontroller');
const pool = require('../models/db'); // Database connection
const verifyToken = require('../verifyToken'); // JWT Middleware
const router = express.Router();
const multer = require('multer');

// Middleware to check session login
const checkLogin = (req, res, next) => {
    if (!req.session.username) {
        return res.status(401).json({ message: 'User not logged in' });
    }
    next();
};

// ========================
// Serve Supplier Pages
// ========================
router.get('/page-list-supplier', checkLogin, (req, res) => {
    res.sendFile('page-list-supplier.html', { root: './public' });
});

router.get('/page-add-supplier', checkLogin, (req, res) => {
    res.sendFile('page-add-supplier.html', { root: './public' });
});

// ========================
// Supplier CRUD Operations
// ========================

// Fetch all suppliers
router.get('/suppliers', verifyToken, supplierController.getSuppliers);

// Fetch a single supplier
router.get('/suppliers/:supplier_id', verifyToken, supplierController.getSupplierById);

// Add a new supplier
router.post('/supplier', verifyToken, multer().none(), supplierController.addSupplier);

// Update or delete supplier based on action
router.post('/supplier/action', verifyToken, supplierController.handleSupplierAction);

// ========================
// PDF Generation
// ========================
router.get('/supplier/pdf/:supplier_id', verifyToken, (req, res) => {
    const supplier_id = req.params.supplier_id;

    pool.query(`SELECT * FROM suppliers WHERE supplier_id = ?`, [supplier_id], (err, supplier) => {
        if (err) return res.status(500).json({ message: 'Error fetching supplier details', error: err });

        if (!supplier || supplier.length === 0) {
            return res.status(404).json({ message: 'Supplier not found' });
        }

        const supplierData = supplier[0];
        const pdf = new pdfkit();
        res.setHeader('Content-Type', 'application/pdf');
        pdf.pipe(res);

        // Generate PDF content
        pdf.fontSize(18).text('Supplier Details', { align: 'center' }).moveDown();
        pdf.fontSize(12).text(`Name: ${supplierData.supplier_name}`);
        pdf.text(`Email: ${supplierData.supplier_email}`);
        pdf.text(`Phone: ${supplierData.supplier_phone}`);
        pdf.text(`Location: ${supplierData.supplier_location}`);
        pdf.text(`Product: ${supplierData.product_name}`);
        pdf.text(`Supply Quantity: ${supplierData.supply_qty}`);
        if (supplierData.note) pdf.text(`Note: ${supplierData.note}`);
        pdf.end();
    });
});

// ========================
// Authentication Routes
// ========================
router.post('/auth/login', authController.loginUser);
router.post('/auth/register', authController.registerUser);
router.post('/auth/logout', verifyToken, authController.logoutUser);

// ========================
// Export Router
// ========================
module.exports = router;

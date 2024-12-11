// routes/salesRoute.js
const express = require('express');
const pool = require('../models/db'); // Import the database connection
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const pool = require('../models/db'); // Import the database connection
const session = require('express-session');
const verifyToken = require('../verifyToken');
const multer = require('multer');

// Router initialization
const router = express.Router();

// Middleware to validate session
function validateSession(req, res, next) {
    if (!req.session.username) {
        return res.status(401).json({ error: 'User not logged in.' });
    }
    next();
}

// POST: Record a sale
router.post('/', validateSession, async (req, res) => {
    const {
        name, saleStatus, salesPrice, totalPrice, salesQty,
        paymentStatus, saleNote, staffName, customerName,
    } = req.body;

    if (!name || !saleStatus || !staffName || !customerName) {
        return res.status(400).json({ error: 'Required fields are missing.' });
    }

    try {
        // Fetch or create staff and customer
        let [staff] = await pool.execute('SELECT * FROM staffs WHERE staffName = ?', [staffName]);
        if (!staff.length) {
            return res.status(404).json({ error: 'Staff not found.' });
        }
        
        let [customer] = await pool.execute('SELECT * FROM customers WHERE customerName = ?', [customerName]);
        if (!customer.length) {
            return res.status(404).json({ error: 'Customer not found.' });
        }

        // Get product ID
        let [product] = await pool.execute('SELECT * FROM products WHERE name = ?', [name]);
        if (!product.length) {
            return res.status(404).json({ error: 'Product not found.' });
        }

        // Insert into sales table
        const result = await pool.execute(
            'INSERT INTO sales (productId, name, totalPrice, salesPrice, salesQty, saleNote, saleStatus, paymentStatus) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', 
            [
                product[0].id, name, totalPrice, salesPrice, salesQty, saleNote, saleStatus, paymentStatus
            ]
        );

        res.status(201).json({ message: 'Sale recorded successfully.', sale: result });
    } catch (err) {
        res.status(500).json({ error: 'Failed to process sale.', details: err.message });
    }
});



// POST: Generate PDF for a sale
async function generateSalePdf(req, res) {
    const saleId = req.params.id;

    try {
        const [sale] = await pool.execute('SELECT * FROM sales WHERE id = ?', [saleId]);
        if (!sale.length) {
            return res.status(404).json({ error: 'Sale not found.' });
        }

        // Generate PDF
        const pdf = new PDFDocument();
        const pdfPath = path.join(__dirname, `../pdfs/sale_${saleId}.pdf`);
        pdf.pipe(fs.createWriteStream(pdfPath));

        pdf.fontSize(16).text('Sales Record', { align: 'center' });
        pdf.moveDown();
        pdf.fontSize(12).text(`Sale Date: ${sale[0].saleDate}`);
        pdf.text(`Product Name: ${sale[0].name}`);
        pdf.text(`Total Price: ${sale[0].totalPrice}`);
        pdf.text(`Sales Price: ${sale[0].salesPrice}`);
        pdf.end();

        res.download(pdfPath, `sale_${saleId}.pdf`, () => {
            fs.unlinkSync(pdfPath); // Delete file after download
        });
    } catch (err) {
        res.status(500).json({ error: 'Failed to generate PDF.', details: err.message });
    }
}

// Set up the route for generating PDF
router.get('/:id/pdf', generateSalePdf);

module.exports = router;

const express = require('express');
const pool = require('../models/db'); // Import the database connection
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const session = require('express-session');

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
        const [staff] = await pool.execute('SELECT * FROM staffs WHERE staffName = ?', [staffName]);
        if (!staff.length) {
            return res.status(404).json({ error: 'Staff not found.' });
        }

        const [customer] = await pool.execute('SELECT * FROM customers WHERE customerName = ?', [customerName]);
        if (!customer.length) {
            return res.status(404).json({ error: 'Customer not found.' });
        }

        // Get product ID
        const [product] = await pool.execute('SELECT * FROM products WHERE name = ?', [name]);
        if (!product.length) {
            return res.status(404).json({ error: 'Product not found.' });
        }

        // Insert into sales table
        await pool.execute(
            'INSERT INTO sales (productId, name, totalPrice, salesPrice, salesQty, saleNote, saleStatus, paymentStatus) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [product[0].id, name, totalPrice, salesPrice, salesQty, saleNote, saleStatus, paymentStatus]
        );

        res.status(201).json({ message: 'Sale recorded successfully.' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to record sale.', details: err.message });
    }
});

// GET: Fetch all sales
router.get('/', validateSession, async (req, res) => {
    try {
        const [sales] = await pool.execute('SELECT * FROM sales');
        res.status(200).json(sales);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch sales.', details: err.message });
    }
});

// GET: Fetch single sale
router.get('/:id', validateSession, async (req, res) => {
    try {
        const [sale] = await pool.execute('SELECT * FROM sales WHERE id = ?', [req.params.id]);
        if (!sale.length) {
            return res.status(404).json({ error: 'Sale not found.' });
        }
        res.status(200).json(sale[0]);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch sale.', details: err.message });
    }
});

// PUT: Update a sale
router.put('/:id', validateSession, async (req, res) => {
    const { saleStatus, salesPrice, totalPrice, salesQty, paymentStatus } = req.body;

    try {
        const [sale] = await pool.execute('SELECT * FROM sales WHERE id = ?', [req.params.id]);
        if (!sale.length) {
            return res.status(404).json({ error: 'Sale not found.' });
        }

        await pool.execute(
            'UPDATE sales SET saleStatus = ?, salesPrice = ?, totalPrice = ?, salesQty = ?, paymentStatus = ? WHERE id = ?',
            [
                saleStatus || sale[0].saleStatus,
                salesPrice || sale[0].salesPrice,
                totalPrice || sale[0].totalPrice,
                salesQty || sale[0].salesQty,
                paymentStatus || sale[0].paymentStatus,
                req.params.id,
            ]
        );

        res.status(200).json({ message: 'Sale updated successfully.' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to update sale.', details: err.message });
    }
});

// DELETE: Remove a sale
router.delete('/:id', validateSession, async (req, res) => {
    try {
        const [sale] = await pool.execute('SELECT * FROM sales WHERE id = ?', [req.params.id]);
        if (!sale.length) {
            return res.status(404).json({ error: 'Sale not found.' });
        }

        await pool.execute('DELETE FROM sales WHERE id = ?', [req.params.id]);
        res.status(200).json({ message: 'Sale deleted successfully.' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete sale.', details: err.message });
    }
});

// POST: Generate PDF for a single sale
router.post('/:id/pdf', validateSession, async (req, res) => {
    try {
        const [sale] = await pool.execute('SELECT * FROM sales WHERE id = ?', [req.params.id]);
        if (!sale.length) {
            return res.status(404).json({ error: 'Sale not found.' });
        }

        const pdf = new PDFDocument();
        const pdfPath = path.join(__dirname, `../sales_${req.params.id}.pdf`);

        pdf.pipe(fs.createWriteStream(pdfPath));
        pdf.fontSize(16).text('Sale Details', { align: 'center' });
        pdf.text(`Sale ID: ${req.params.id}`);
        pdf.text(`Name: ${sale[0].name}`);
        pdf.text(`Total Price: ${sale[0].totalPrice}`);
        pdf.text(`Sales Price: ${sale[0].salesPrice}`);
        pdf.text(`Sales Quantity: ${sale[0].salesQty}`);
        pdf.text(`Status: ${sale[0].saleStatus}`);
        pdf.end();

        res.download(pdfPath, `sale_${req.params.id}.pdf`, () => {
            fs.unlinkSync(pdfPath);
        });
    } catch (err) {
        res.status(500).json({ error: 'Failed to generate PDF.', details: err.message });
    }
});

module.exports = router;

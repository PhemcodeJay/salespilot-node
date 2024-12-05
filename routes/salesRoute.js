const express = require('express');
const { Sales, Products, Staffs, Customers } = require('../models'); // Ensure this path is correct
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// Router initialization
const router = express.Router();

// MySQL connection setup
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
});

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
        const staff = await Staffs.findOrCreate({ where: { staffName } });
        const customer = await Customers.findOrCreate({ where: { customerName } });

        // Get product ID
        const product = await Products.findOne({ where: { name } });
        if (!product) {
            return res.status(404).json({ error: 'Product not found.' });
        }

        // Insert into sales table
        const sale = await Sales.create({
            productId: product.id,
            name,
            totalPrice,
            salesPrice,
            salesQty,
            saleNote,
            saleStatus,
            paymentStatus,
        });

        res.status(201).json({ message: 'Sale recorded successfully.', sale });
    } catch (err) {
        res.status(500).json({ error: 'Failed to process sale.', details: err.message });
    }
});

// GET: Inventory notifications (low/high stock alerts)
router.get('/inventory-notifications', validateSession, async (req, res) => {
    try {
        const lowStockThreshold = 10;
        const highStockThreshold = 1000;

        const inventoryNotifications = await Inventory.findAll({
            include: [{
                model: Products,
                attributes: ['imagePath'],
            }],
            where: {
                [Sequelize.Op.or]: [
                    { availableStock: { [Sequelize.Op.lt]: lowStockThreshold } },
                    { availableStock: { [Sequelize.Op.gt]: highStockThreshold } },
                ],
            },
            order: [['lastUpdated', 'DESC']],
        });

        res.json(inventoryNotifications);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch inventory notifications.', details: err.message });
    }
});

// POST: Generate PDF for a sale
router.post('/:id/pdf', validateSession, async (req, res) => {
    const saleId = req.params.id;

    try {
        const sale = await Sales.findByPk(saleId);
        if (!sale) {
            return res.status(404).json({ error: 'Sale not found.' });
        }

        // Generate PDF
        const pdf = new PDFDocument();
        const pdfPath = path.join(__dirname, `../pdfs/sale_${saleId}.pdf`);
        pdf.pipe(fs.createWriteStream(pdfPath));

        pdf.fontSize(16).text('Sales Record', { align: 'center' });
        pdf.moveDown();
        pdf.fontSize(12).text(`Sale Date: ${sale.saleDate}`);
        pdf.text(`Product Name: ${sale.name}`);
        pdf.text(`Total Price: ${sale.totalPrice}`);
        pdf.text(`Sales Price: ${sale.salesPrice}`);
        pdf.end();

        res.download(pdfPath, `sale_${saleId}.pdf`, () => {
            fs.unlinkSync(pdfPath); // Delete file after download
        });
    } catch (err) {
        res.status(500).json({ error: 'Failed to generate PDF.', details: err.message });
    }
});

module.exports = router;

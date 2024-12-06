const express = require('express');
const mysql = require('mysql2');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const productController = require('../controllers/productcontroller');
const authController = require('../controllers/authcontroller');
const salesController = require('../controllers/salescontroller');
const router = express.Router();

// MySQL connection setup
const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'dbs13455438'
});



// Middleware to parse incoming JSON requests
router.use(express.json());

// Get Inventory Data
router.get('/inventory', async (req, res) => {
    try {
        const [inventoryData] = await connection.promise().query(
            'SELECT p.id, p.name, p.category, p.price, p.inventory_qty, p.stock_qty, p.supply_qty FROM products p'
        );

        if (inventoryData.length === 0) {
            return res.status(404).json({ success: false, message: 'No inventory data found' });
        }

        return res.status(200).json({ success: true, data: inventoryData });
    } catch (error) {
        console.error('Error fetching inventory data:', error);
        return res.status(500).json({ success: false, message: 'Error fetching inventory data' });
    }
});

// Update Product Stock
router.put('/inventory/update/:id', async (req, res) => {
    const { id } = req.params;
    const { stock_qty, supply_qty, inventory_qty } = req.body;

    if (!stock_qty || !supply_qty || !inventory_qty) {
        return res.status(400).json({ success: false, message: 'Missing required data' });
    }

    try {
        const [result] = await connection.promise().query(
            'UPDATE products SET stock_qty = ?, supply_qty = ?, inventory_qty = ? WHERE id = ?',
            [stock_qty, supply_qty, inventory_qty, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        return res.status(200).json({ success: true, message: 'Inventory updated successfully' });
    } catch (error) {
        console.error('Error updating inventory:', error);
        return res.status(500).json({ success: false, message: 'Error updating inventory' });
    }
});

// Generate PDF Report for Inventory
router.get('/inventory/pdf', async (req, res) => {
    try {
        const [inventoryData] = await connection.promise().query(
            'SELECT p.id, p.name, p.category, p.price, p.inventory_qty, p.stock_qty, p.supply_qty FROM products p'
        );

        if (inventoryData.length === 0) {
            return res.status(404).json({ success: false, message: 'No inventory data found' });
        }

        const doc = new PDFDocument();
        doc.pipe(res);  // Send the PDF directly to the response (streaming to client)

        // Add header to PDF
        doc.font('Helvetica-Bold').fontSize(16).text('Inventory Report', { align: 'center' });
        doc.moveDown();

        // Add column headers
        doc.font('Helvetica-Bold').fontSize(12)
            .text('Product ID', 50, doc.y)
            .text('Product Name', 150, doc.y)
            .text('Category', 250, doc.y)
            .text('Price', 350, doc.y)
            .text('Stock Qty', 450, doc.y)
            .text('Supply Qty', 550, doc.y)
            .text('Inventory Qty', 650, doc.y);
        doc.moveDown();

        // Add inventory data rows
        doc.font('Helvetica').fontSize(10);
        inventoryData.forEach((product) => {
            doc.text(product.id.toString(), 50, doc.y)
                .text(product.name, 150, doc.y)
                .text(product.category, 250, doc.y)
                .text(`$${product.price.toFixed(2)}`, 350, doc.y)
                .text(product.stock_qty.toString(), 450, doc.y)
                .text(product.supply_qty.toString(), 550, doc.y)
                .text(product.inventory_qty.toString(), 650, doc.y);
            doc.moveDown();
        });

        doc.end();  // Close the PDF document

    } catch (error) {
        console.error('Error generating PDF:', error);
        return res.status(500).json({ success: false, message: 'Error generating PDF' });
    }
});

// Export the router
module.exports = router;

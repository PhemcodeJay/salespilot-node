const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const mysql = require('mysql2');
const jwt = require('jsonwebtoken');
const PDFDocument = require('pdfkit');
const { pool } = require('../models/db'); // Assuming pool is already configured in db.js
const productModel = require('../models/product');
const inventoryModel = require('../models/inventory');
const userModel = require('../models/user');

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadsDir = path.join(__dirname, '..', 'uploads');
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir);
        }
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname);
    }
});

const upload = multer({ storage: storage });

// Generate PDF report of all Products
const generateProductsPdf = async (req, res) => {
    try {
        const [Products] = await pool.promise().query('SELECT * FROM Products ORDER BY date DESC');

        if (Products.length === 0) {
            return res.status(404).json({ message: 'No Products found' });
        }

        const reportsDir = path.join(__dirname, '..', 'reports');
        if (!fs.existsSync(reportsDir)) {
            fs.mkdirSync(reportsDir);
        }

        const doc = new PDFDocument();
        const filePath = path.join(reportsDir, `Products_report_${Date.now()}.pdf`);

        doc.pipe(fs.createWriteStream(filePath));

        doc.fontSize(18).text('Product Report', { align: 'center' });
        doc.moveDown();
        doc.fontSize(12).text(`Date Generated: ${new Date().toLocaleString()}`, { align: 'center' });
        doc.moveDown();
        
        doc.text('--------------------------------------', { align: 'center' });
        doc.moveDown();
        
        doc.text('ID | Description | Amount | Date | Category');
        doc.text('--------------------------------------');
        
        Products.forEach(Product => {
            doc.text(`${Product.id} | ${Product.description} | $${Product.amount} | ${Product.date} | ${Product.category}`);
        });

        doc.end();

        res.status(200).json({ message: 'PDF report generated successfully', filePath: filePath });
    } catch (err) {
        return res.status(500).json({ message: 'Error generating PDF', error: err.message });
    }
};

// Add or update a product
router.post('/product', upload.single('pic'), async (req, res) => {
    const {
        name,
        staff_name,
        product_type,
        category_name,
        cost = 0,
        price = 0,
        stock_qty = 0,
        supply_qty = 0,
        description,
        new_category,
    } = req.body;

    try {
        const sanitizedData = {
            name: sanitizeInput(name),
            staff_name: sanitizeInput(staff_name),
            product_type: sanitizeInput(product_type),
            category_name: sanitizeInput(category_name),
            cost: parseFloat(cost),
            price: parseFloat(price),
            stock_qty: parseInt(stock_qty),
            supply_qty: parseInt(supply_qty),
            description: sanitizeInput(description),
            new_category: sanitizeInput(new_category),
        };

        let category_id;
        if (sanitizedData.category_name === 'New' && sanitizedData.new_category) {
            const [existingCategory] = await pool.promise().query(
                'SELECT category_id FROM categories WHERE category_name = ?',
                [sanitizedData.new_category]
            );

            if (!existingCategory) {
                const result = await pool.promise().query(
                    'INSERT INTO categories (category_name) VALUES (?)',
                    [sanitizedData.new_category]
                );
                category_id = result.insertId;
            } else {
                category_id = existingCategory.category_id;
            }
        } else {
            const [category] = await pool.promise().query(
                'SELECT category_id FROM categories WHERE category_name = ?',
                [sanitizedData.category_name]
            );

            if (!category) {
                return res.status(404).json({ success: false, message: "Category not found." });
            }
            category_id = category.category_id;
        }

        let imagePath = null;
        if (req.file) {
            imagePath = path.join(req.file.destination, req.file.filename);
            ensureDirectoryExistence(imagePath);
        }

        const [existingProduct] = await pool.promise().query(
            'SELECT id FROM products WHERE name = ? AND category_id = ?',
            [sanitizedData.name, category_id]
        );

        if (existingProduct) {
            await pool.promise().query(
                `UPDATE products 
                 SET staff_name = ?, product_type = ?, cost = ?, price = ?, stock_qty = ?, 
                     supply_qty = ?, description = ?, image_path = ?, category_id = ? 
                 WHERE id = ?`,
                [
                    sanitizedData.staff_name,
                    sanitizedData.product_type,
                    sanitizedData.cost,
                    sanitizedData.price,
                    sanitizedData.stock_qty,
                    sanitizedData.supply_qty,
                    sanitizedData.description,
                    imagePath,
                    category_id,
                    existingProduct.id,
                ]
            );
        } else {
            await pool.promise().query(
                `INSERT INTO products 
                 (name, staff_name, product_type, category_id, cost, price, stock_qty, supply_qty, description, image_path) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    sanitizedData.name,
                    sanitizedData.staff_name,
                    sanitizedData.product_type,
                    category_id,
                    sanitizedData.cost,
                    sanitizedData.price,
                    sanitizedData.stock_qty,
                    sanitizedData.supply_qty,
                    sanitizedData.description,
                    imagePath,
                ]
            );
        }

        res.json({ success: true, message: "Product added/updated successfully." });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Server error." });
    }
});

module.exports = router;

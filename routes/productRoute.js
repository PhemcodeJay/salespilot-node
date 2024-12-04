const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');

// Middleware for file uploads
const upload = multer({
    dest: 'uploads/products/', // Directory to store uploaded files
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max file size
});

// Helper function to sanitize user input
const sanitizeInput = (input) => input?.trim()?.replace(/[<>"]/g, '');

// List all products
router.get('/products', async (req, res) => {
    try {
        const products = await db.query(
            'SELECT id, name, description, price, image_path, category, inventory_qty, cost FROM products'
        );
        res.render('listProduct', { products }); // Render list of products to 'listProduct' page
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Server error." });
    }
});

// Add or Update a product (GET for displaying form)
router.get('/product/add', async (req, res) => {
    try {
        const categories = await db.query('SELECT category_id, category_name FROM categories');
        res.render('addProduct', { categories }); // Render the add product form with category options
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Server error." });
    }
});

// Add or Update a product (POST for form submission)
router.post('/product/add', upload.single('pic'), async (req, res) => {
    const { name, staff_name, category_name, cost = 0, price = 0, stock_qty = 0, supply_qty = 0, description, new_category } = req.body;

    try {
        const sanitizedData = {
            name: sanitizeInput(name),
            staff_name: sanitizeInput(staff_name),
            category_name: sanitizeInput(category_name),
            cost: parseFloat(cost),
            price: parseFloat(price),
            stock_qty: parseInt(stock_qty),
            supply_qty: parseInt(supply_qty),
            description: sanitizeInput(description),
            new_category: sanitizeInput(new_category),
        };

        // Category logic
        let category_id;
        if (sanitizedData.category_name === 'New' && sanitizedData.new_category) {
            const [existingCategory] = await db.query('SELECT category_id FROM categories WHERE category_name = ?', [sanitizedData.new_category]);

            if (!existingCategory) {
                const result = await db.query('INSERT INTO categories (category_name) VALUES (?)', [sanitizedData.new_category]);
                category_id = result.insertId;
            } else {
                category_id = existingCategory.category_id;
            }
        } else {
            const [category] = await db.query('SELECT category_id FROM categories WHERE category_name = ?', [sanitizedData.category_name]);
            category_id = category?.category_id;
        }

        // File upload handling
        let imagePath = null;
        if (req.file) {
            imagePath = path.join(req.file.destination, req.file.filename);
        }

        // Check if product exists
        const [existingProduct] = await db.query('SELECT id FROM products WHERE name = ? AND category_id = ?', [sanitizedData.name, category_id]);

        if (existingProduct) {
            // Update existing product
            await db.query(
                `UPDATE products 
                 SET staff_name = ?, category_id = ?, cost = ?, price = ?, stock_qty = ?, 
                     supply_qty = ?, description = ?, image_path = ?
                 WHERE id = ?`,
                [
                    sanitizedData.staff_name,
                    category_id,
                    sanitizedData.cost,
                    sanitizedData.price,
                    sanitizedData.stock_qty,
                    sanitizedData.supply_qty,
                    sanitizedData.description,
                    imagePath,
                    existingProduct.id,
                ]
            );
        } else {
            // Insert new product
            await db.query(
                `INSERT INTO products 
                 (name, staff_name, category_id, cost, price, stock_qty, supply_qty, description, image_path)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    sanitizedData.name,
                    sanitizedData.staff_name,
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

        res.redirect('/api/products'); // Redirect to list products page after adding or updating
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Server error." });
    }
});

module.exports = router;

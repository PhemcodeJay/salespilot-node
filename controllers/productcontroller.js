const express = require('express');
const router = express.Router();
const multer = require('multer'); // For file uploads
const path = require('path');
const { db } = require('./db'); // Assume db is a configured database connection instance
const fs = require('fs');

// MySQL connection setup
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
});

// Middleware for file uploads
const upload = multer({
    dest: 'uploads/products/',
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        if (['.jpg', '.jpeg', '.png', '.gif'].includes(ext)) {
            return cb(null, true);
        }
        cb(new Error('Invalid file type. Only images are allowed.'));
    }
});

// Ensure the upload directory exists
const ensureDirectoryExistence = (filePath) => {
    const dirname = path.dirname(filePath);
    if (fs.existsSync(dirname)) {
        return true;
    }
    fs.mkdirSync(dirname, { recursive: true });
};

// Sanitize input helper
const sanitizeInput = (input) => input?.trim()?.replace(/[<>"]/g, '');

// Fetch user info
router.get('/user', async (req, res) => {
    try {
        const username = sanitizeInput(req.session.username);
        if (!username) {
            return res.status(400).json({ success: false, message: "No username found in session." });
        }

        const [user] = await db.query(
            'SELECT username, email, date FROM users WHERE username = ?',
            [username]
        );

        if (!user) {
            return res.status(404).json({ success: false, message: "User not found." });
        }

        res.json({
            success: true,
            user: {
                username: user.username,
                email: user.email,
                date: user.date,
            },
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Server error." });
    }
});

// Fetch products
router.get('/products', async (req, res) => {
    try {
        const products = await db.query(
            'SELECT id, name, description, price, image_path, category, inventory_qty, cost FROM products'
        );
        res.json({ success: true, products });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Server error." });
    }
});

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

        // Category logic
        let category_id;
        if (sanitizedData.category_name === 'New' && sanitizedData.new_category) {
            const [existingCategory] = await db.query(
                'SELECT category_id FROM categories WHERE category_name = ?',
                [sanitizedData.new_category]
            );

            if (!existingCategory) {
                const result = await db.query(
                    'INSERT INTO categories (category_name) VALUES (?)',
                    [sanitizedData.new_category]
                );
                category_id = result.insertId;
            } else {
                category_id = existingCategory.category_id;
            }
        } else {
            const [category] = await db.query(
                'SELECT category_id FROM categories WHERE category_name = ?',
                [sanitizedData.category_name]
            );

            if (!category) {
                return res.status(404).json({ success: false, message: "Category not found." });
            }
            category_id = category.category_id;
        }

        // File upload handling
        let imagePath = null;
        if (req.file) {
            imagePath = path.join(req.file.destination, req.file.filename);
            ensureDirectoryExistence(imagePath); // Ensure directory exists before saving
        }

        // Check if product exists
        const [existingProduct] = await db.query(
            'SELECT id FROM products WHERE name = ? AND category_id = ?',
            [sanitizedData.name, category_id]
        );

        if (existingProduct) {
            // Update existing product
            await db.query(
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
            // Insert new product
            await db.query(
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

// Inventory Notifications
router.get('/inventory/notifications', async (req, res) => {
    try {
        const inventoryNotifications = await db.query(`
            SELECT i.product_name, i.available_stock, i.inventory_qty, i.sales_qty, p.image_path
            FROM inventory i
            JOIN products p ON i.product_id = p.id
            WHERE i.available_stock < ? OR i.available_stock > ?
            ORDER BY i.last_updated DESC
        `, [10, 1000]);

        res.json({ success: true, inventoryNotifications });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Server error." });
    }
});

// Export the router
module.exports = router;

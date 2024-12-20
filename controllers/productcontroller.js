const fs = require('fs');
const path = require('path');
const { pool } = require('../models/db'); // Assuming pool is already configured
const { checkLogin } = require('../middleware/auth'); // Import middleware

// List all inventory records (view-only)
const listInventory = async (req, res) => {
    try {
        // Query for inventory data, you may want to join with products, categories, etc.
        const [inventory] = await pool.promise().query('SELECT * FROM inventory');
        res.json({ success: true, inventory });
    } catch (error) {
        console.error('Error listing inventory:', error);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
};

// List all categories
const listCategories = async (req, res) => {
    try {
        const [categories] = await pool.promise().query('SELECT * FROM categories');
        res.json({ success: true, categories });
    } catch (error) {
        console.error('Error listing categories:', error);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
};

// List all products
const listProducts = async (req, res) => {
    try {
        const [products] = await pool.promise().query('SELECT * FROM products');
        res.json({ success: true, products });
    } catch (error) {
        console.error('Error listing products:', error);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
};

// Add or update a product in the inventory
const addOrUpdateProduct = async (req, res) => {
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
            name: name.trim(),
            staff_name: staff_name.trim(),
            product_type: product_type.trim(),
            category_name: category_name.trim(),
            cost: parseFloat(cost),
            price: parseFloat(price),
            stock_qty: parseInt(stock_qty, 10),
            supply_qty: parseInt(supply_qty, 10),
            description: description.trim(),
            new_category: new_category.trim(),
        };

        let category_id;
        if (sanitizedData.category_name === 'New' && sanitizedData.new_category) {
            const [existingCategory] = await pool.promise().query(
                'SELECT category_id FROM categories WHERE category_name = ?',
                [sanitizedData.new_category]
            );

            if (existingCategory.length === 0) {
                const [result] = await pool.promise().query(
                    'INSERT INTO categories (category_name) VALUES (?)',
                    [sanitizedData.new_category]
                );
                category_id = result.insertId;
            } else {
                category_id = existingCategory[0].category_id;
            }
        } else {
            const [category] = await pool.promise().query(
                'SELECT category_id FROM categories WHERE category_name = ?',
                [sanitizedData.category_name]
            );

            if (category.length === 0) {
                return res.status(404).json({ success: false, message: 'Category not found.' });
            }
            category_id = category[0].category_id;
        }

        let imagePath = null;
        if (req.file) {
            imagePath = path.join(req.file.destination, req.file.filename);
            const dir = path.dirname(imagePath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
        }

        const [existingProduct] = await pool.promise().query(
            'SELECT id FROM products WHERE name = ? AND category_id = ?',
            [sanitizedData.name, category_id]
        );

        if (existingProduct.length > 0) {
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
                    existingProduct[0].id,
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

        res.json({ success: true, message: 'Product added/updated successfully.' });
    } catch (error) {
        console.error('Error adding/updating product:', error);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
};

// Delete a product from the inventory
const deleteProduct = async (req, res) => {
    const { id } = req.params;

    try {
        // Check if product exists
        const [product] = await pool.promise().query(
            'SELECT id, image_path FROM products WHERE id = ?',
            [id]
        );

        if (product.length === 0) {
            return res.status(404).json({ success: false, message: 'Product not found.' });
        }

        // Delete the product's image file if it exists
        if (product[0].image_path && fs.existsSync(product[0].image_path)) {
            fs.unlinkSync(product[0].image_path);
        }

        // Delete the product from the database
        await pool.promise().query('DELETE FROM products WHERE id = ?', [id]);

        res.json({ success: true, message: 'Product deleted successfully.' });
    } catch (error) {
        console.error('Error deleting product:', error);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
};

// Export the functions for use in the routes
module.exports = {
    listInventory,     // List inventory records
    listCategories,    // Newly added for listing categories
    listProducts,
    addOrUpdateProduct,
    deleteProduct,
};

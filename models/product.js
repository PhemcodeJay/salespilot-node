const mysql = require('mysql2');

// Database pool configuration
const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'dbs13455438',
    charset: 'utf8mb4',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
});

// Helper for database queries
const db = {
    query: (sql, params) => new Promise((resolve, reject) => {
        pool.query(sql, params, (err, results) => {
            if (err) reject(err);
            resolve(results);
        });
    }),
};

class Products {
    static async getAllProducts() {
        const query = 'SELECT * FROM products ORDER BY created_at DESC';
        return db.query(query);
    }

    static async createOrUpdateProduct(productData) {
        const { name, description, price, cost, category_id, stock_qty, supply_qty, image_path, product_type, staff_name, category } = productData;

        const [existingProduct] = await db.query(
            'SELECT id FROM products WHERE name = ? AND category_id = ?',
            [name, category_id]
        );

        if (existingProduct) {
            await db.query(
                `UPDATE products 
                 SET description = ?, price = ?, cost = ?, stock_qty = ?, supply_qty = ?, image_path = ?, 
                     product_type = ?, staff_name = ?, category = ? 
                 WHERE id = ?`,
                [description, price, cost, stock_qty, supply_qty, image_path, product_type, staff_name, category, existingProduct.id]
            );
            return { message: 'Product updated successfully' };
        } else {
            await db.query(
                `INSERT INTO products (name, description, price, cost, category_id, stock_qty, supply_qty, image_path, product_type, staff_name, category) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [name, description, price, cost, category_id, stock_qty, supply_qty, image_path, product_type, staff_name, category]
            );
            return { message: 'Product added successfully' };
        }
    }
}

module.exports = Products;

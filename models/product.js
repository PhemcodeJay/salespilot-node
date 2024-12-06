const mysql = require('mysql2');

// Create database connection pool for better performance
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

class Products {
    static async createProductsTable() {
      const createTableQuery = `
        CREATE TABLE IF NOT EXISTS products (
          id INT(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(100) NOT NULL,
          description TEXT NOT NULL,
          price DECIMAL(10,2) NOT NULL,
          cost DECIMAL(10,2) NOT NULL,
          category_id INT(11) NOT NULL,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          stock_qty INT(11) NOT NULL,
          supply_qty INT(11) NOT NULL,
          image_path VARCHAR(255) NOT NULL,
          product_type ENUM('Goods', 'Services', 'Digital') NOT NULL DEFAULT 'Goods',
          staff_name VARCHAR(45) NOT NULL,
          category VARCHAR(255) NOT NULL,
          inventory_qty INT(11) GENERATED ALWAYS AS (stock_qty + supply_qty) STORED,
          profit DECIMAL(10,2) GENERATED ALWAYS AS (price - cost) STORED
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
      `;
      await db.query(createTableQuery);
      console.log('Products table created or already exists.');
    }
  
    static async createProduct(productData) {
      const insertProductQuery = `
        INSERT INTO products (name, description, price, cost, category_id, stock_qty, supply_qty, image_path, product_type, staff_name, category)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      const { name, description, price, cost, category_id, stock_qty, supply_qty, image_path, product_type, staff_name, category } = productData;
  
      try {
        const [result] = await db.query(insertProductQuery, [name, description, price, cost, category_id, stock_qty, supply_qty, image_path, product_type, staff_name, category]);
        return { id: result.insertId };
      } catch (error) {
        throw new Error(`Error creating product: ${error.message}`);
      }
    }
  
    static async getProductById(id) {
      const query = `SELECT * FROM products WHERE id = ?`;
  
      try {
        const [rows] = await db.query(query, [id]);
        if (rows.length === 0) throw new Error('Product not found.');
        return rows[0];
      } catch (error) {
        throw new Error(`Error fetching product: ${error.message}`);
      }
    }
  
    static async getAllProducts() {
      const query = `SELECT * FROM products ORDER BY created_at DESC`;
  
      try {
        const [rows] = await db.query(query);
        return rows;
      } catch (error) {
        throw new Error(`Error fetching all products: ${error.message}`);
      }
    }
  
    static async updateProduct(id, updatedData) {
      const { name, description, price, cost, category_id, stock_qty, supply_qty, image_path, product_type, staff_name, category } = updatedData;
  
      const updateQuery = `
        UPDATE products
        SET name = ?, description = ?, price = ?, cost = ?, category_id = ?, stock_qty = ?, supply_qty = ?, image_path = ?, product_type = ?, staff_name = ?, category = ?
        WHERE id = ?
      `;
      
      try {
        const [result] = await db.query(updateQuery, [name, description, price, cost, category_id, stock_qty, supply_qty, image_path, product_type, staff_name, category, id]);
        return result.affectedRows > 0;
      } catch (error) {
        throw new Error(`Error updating product: ${error.message}`);
      }
    }
  
    static async deleteProduct(id) {
      const deleteQuery = `DELETE FROM products WHERE id = ?`;
  
      try {
        const [result] = await db.query(deleteQuery, [id]);
        return result.affectedRows > 0;
      } catch (error) {
        throw new Error(`Error deleting product: ${error.message}`);
      }
    }
  }
  
  module.exports = Products;
  
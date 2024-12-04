const mysql = require('mysql2');

// Create database connection pool
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

// Promisify the pool for async/await usage
const db = pool.promise();

/**
 * Product Model
 */
class Product {
  static async getAll() {
    const [rows] = await db.query('SELECT * FROM products');
    return rows;
  }

  static async getById(id) {
    const [rows] = await db.query('SELECT * FROM products WHERE id = ?', [id]);
    if (rows.length === 0) throw new Error('Product not found');
    return rows[0];
  }

  static async create(product) {
    const {
      name, description, price, cost, category_id, stock_qty, supply_qty, image_path, product_type, staff_name, category,
    } = product;

    const [result] = await db.query(
      `INSERT INTO products 
      (name, description, price, cost, category_id, stock_qty, supply_qty, image_path, product_type, staff_name, category)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, description, price, cost, category_id, stock_qty, supply_qty, image_path, product_type, staff_name, category]
    );

    return { id: result.insertId };
  }

  static async update(id, product) {
    const {
      name, description, price, cost, category_id, stock_qty, supply_qty, image_path, product_type, staff_name, category,
    } = product;

    const [result] = await db.query(
      `UPDATE products 
      SET name = ?, description = ?, price = ?, cost = ?, category_id = ?, stock_qty = ?, supply_qty = ?, 
      image_path = ?, product_type = ?, staff_name = ?, category = ? WHERE id = ?`,
      [name, description, price, cost, category_id, stock_qty, supply_qty, image_path, product_type, staff_name, category, id]
    );

    return result;
  }

  static async delete(id) {
    const [result] = await db.query('DELETE FROM products WHERE id = ?', [id]);
    return result;
  }
}

/**
 * Sales Model
 */
class Sales {
  static async getAll() {
    const [rows] = await db.query('SELECT * FROM sales');
    return rows;
  }

  static async getById(salesId) {
    const [rows] = await db.query('SELECT * FROM sales WHERE sales_id = ?', [salesId]);
    if (rows.length === 0) throw new Error('Sale not found');
    return rows[0];
  }

  static async create(sale) {
    const {
      product_id, user_id, customer_id, staff_id, sales_qty, sale_status, payment_status, name, product_type, sale_note, sales_price,
    } = sale;

    const [result] = await db.query(
      `INSERT INTO sales 
      (product_id, user_id, customer_id, staff_id, sales_qty, sale_status, payment_status, name, product_type, sale_note, sales_price)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [product_id, user_id, customer_id, staff_id, sales_qty, sale_status, payment_status, name, product_type, sale_note, sales_price]
    );

    return { sales_id: result.insertId };
  }

  static async update(salesId, sale) {
    const {
      product_id, user_id, customer_id, staff_id, sales_qty, sale_status, payment_status, name, product_type, sale_note, sales_price,
    } = sale;

    const [result] = await db.query(
      `UPDATE sales 
      SET product_id = ?, user_id = ?, customer_id = ?, staff_id = ?, sales_qty = ?, sale_status = ?, payment_status = ?, 
      name = ?, product_type = ?, sale_note = ?, sales_price = ? WHERE sales_id = ?`,
      [product_id, user_id, customer_id, staff_id, sales_qty, sale_status, payment_status, name, product_type, sale_note, sales_price, salesId]
    );

    return result;
  }

  static async delete(salesId) {
    const [result] = await db.query('DELETE FROM sales WHERE sales_id = ?', [salesId]);
    return result;
  }
}

/**
 * Inventory Model
 */
class Inventory {
  static async getAll() {
    const [rows] = await db.query('SELECT * FROM inventory');
    return rows;
  }

  static async getById(inventoryId) {
    const [rows] = await db.query('SELECT * FROM inventory WHERE inventory_id = ?', [inventoryId]);
    if (rows.length === 0) throw new Error('Inventory not found');
    return rows[0];
  }

  static async create(inventory) {
    const { product_id, sales_qty, stock_qty, supply_qty, product_name } = inventory;

    const [result] = await db.query(
      `INSERT INTO inventory 
      (product_id, sales_qty, stock_qty, supply_qty, product_name) 
      VALUES (?, ?, ?, ?, ?)`,
      [product_id, sales_qty, stock_qty, supply_qty, product_name]
    );

    return { inventory_id: result.insertId };
  }

  static async update(inventoryId, inventory) {
    const { product_id, sales_qty, stock_qty, supply_qty, product_name } = inventory;

    const [result] = await db.query(
      `UPDATE inventory 
      SET product_id = ?, sales_qty = ?, stock_qty = ?, supply_qty = ?, product_name = ? 
      WHERE inventory_id = ?`,
      [product_id, sales_qty, stock_qty, supply_qty, product_name, inventoryId]
    );

    return result;
  }

  static async delete(inventoryId) {
    const [result] = await db.query('DELETE FROM inventory WHERE inventory_id = ?', [inventoryId]);
    return result;
  }
}

// Export all models
module.exports = { Product, Sales, Inventory };

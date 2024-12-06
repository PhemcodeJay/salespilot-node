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

class Suppliers {
    // Create the suppliers table if it doesn't exist
    static async createSuppliersTable() {
      const createTableQuery = `
        CREATE TABLE IF NOT EXISTS suppliers (
          supplier_id INT(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
          supplier_name VARCHAR(255) NOT NULL,
          supplier_email VARCHAR(255) NOT NULL,
          supplier_phone VARCHAR(20) NOT NULL,
          supplier_location VARCHAR(255) NOT NULL,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          product_name VARCHAR(255) NOT NULL,
          supply_qty INT(11) NOT NULL,
          note TEXT NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
      `;
      return new Promise((resolve, reject) => {
        pool.query(createTableQuery, (err, result) => {
          if (err) return reject(new Error(`Error creating table: ${err.message}`));
          console.log('Suppliers table created or already exists.');
          resolve(result);
        });
      });
    }
  
    // Create a new supplier
    static async createSupplier(supplierData) {
      const insertSupplierQuery = `
        INSERT INTO suppliers (supplier_name, supplier_email, supplier_phone, supplier_location, product_name, supply_qty, note)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `;
      const { supplier_name, supplier_email, supplier_phone, supplier_location, product_name, supply_qty, note } = supplierData;
  
      return new Promise((resolve, reject) => {
        pool.query(insertSupplierQuery, [supplier_name, supplier_email, supplier_phone, supplier_location, product_name, supply_qty, note], (err, result) => {
          if (err) return reject(new Error(`Error creating supplier: ${err.message}`));
          resolve({ supplier_id: result.insertId });
        });
      });
    }
  
    // Get a supplier by ID
    static async getSupplierById(supplier_id) {
      const query = `SELECT * FROM suppliers WHERE supplier_id = ?`;
  
      return new Promise((resolve, reject) => {
        pool.query(query, [supplier_id], (err, rows) => {
          if (err) return reject(new Error(`Error fetching supplier: ${err.message}`));
          if (rows.length === 0) return reject(new Error('Supplier not found.'));
          resolve(rows[0]);
        });
      });
    }
  
    // Get all suppliers
    static async getAllSuppliers() {
      const query = `SELECT * FROM suppliers ORDER BY created_at DESC`;
  
      return new Promise((resolve, reject) => {
        pool.query(query, (err, rows) => {
          if (err) return reject(new Error(`Error fetching all suppliers: ${err.message}`));
          resolve(rows);
        });
      });
    }
  
    // Update a supplier
    static async updateSupplier(supplier_id, updatedData) {
      const { supplier_name, supplier_email, supplier_phone, supplier_location, product_name, supply_qty, note } = updatedData;
  
      const updateQuery = `
        UPDATE suppliers
        SET supplier_name = ?, supplier_email = ?, supplier_phone = ?, supplier_location = ?, product_name = ?, supply_qty = ?, note = ?
        WHERE supplier_id = ?
      `;
      
      return new Promise((resolve, reject) => {
        pool.query(updateQuery, [supplier_name, supplier_email, supplier_phone, supplier_location, product_name, supply_qty, note, supplier_id], (err, result) => {
          if (err) return reject(new Error(`Error updating supplier: ${err.message}`));
          resolve(result.affectedRows > 0);
        });
      });
    }
  
    // Delete a supplier by ID
    static async deleteSupplier(supplier_id) {
      const deleteQuery = `DELETE FROM suppliers WHERE supplier_id = ?`;
  
      return new Promise((resolve, reject) => {
        pool.query(deleteQuery, [supplier_id], (err, result) => {
          if (err) return reject(new Error(`Error deleting supplier: ${err.message}`));
          resolve(result.affectedRows > 0);
        });
      });
    }
}

module.exports = Suppliers;

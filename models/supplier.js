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
      await db.query(createTableQuery);
      console.log('Suppliers table created or already exists.');
    }
  
    static async createSupplier(supplierData) {
      const insertSupplierQuery = `
        INSERT INTO suppliers (supplier_name, supplier_email, supplier_phone, supplier_location, product_name, supply_qty, note)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `;
      const { supplier_name, supplier_email, supplier_phone, supplier_location, product_name, supply_qty, note } = supplierData;
  
      try {
        const [result] = await db.query(insertSupplierQuery, [supplier_name, supplier_email, supplier_phone, supplier_location, product_name, supply_qty, note]);
        return { supplier_id: result.insertId };
      } catch (error) {
        throw new Error(`Error creating supplier: ${error.message}`);
      }
    }
  
    static async getSupplierById(supplier_id) {
      const query = `SELECT * FROM suppliers WHERE supplier_id = ?`;
  
      try {
        const [rows] = await db.query(query, [supplier_id]);
        if (rows.length === 0) throw new Error('Supplier not found.');
        return rows[0];
      } catch (error) {
        throw new Error(`Error fetching supplier: ${error.message}`);
      }
    }
  
    static async getAllSuppliers() {
      const query = `SELECT * FROM suppliers ORDER BY created_at DESC`;
  
      try {
        const [rows] = await db.query(query);
        return rows;
      } catch (error) {
        throw new Error(`Error fetching all suppliers: ${error.message}`);
      }
    }
  
    static async updateSupplier(supplier_id, updatedData) {
      const { supplier_name, supplier_email, supplier_phone, supplier_location, product_name, supply_qty, note } = updatedData;
  
      const updateQuery = `
        UPDATE suppliers
        SET supplier_name = ?, supplier_email = ?, supplier_phone = ?, supplier_location = ?, product_name = ?, supply_qty = ?, note = ?
        WHERE supplier_id = ?
      `;
      
      try {
        const [result] = await db.query(updateQuery, [supplier_name, supplier_email, supplier_phone, supplier_location, product_name, supply_qty, note, supplier_id]);
        return result.affectedRows > 0;
      } catch (error) {
        throw new Error(`Error updating supplier: ${error.message}`);
      }
    }
  
    static async deleteSupplier(supplier_id) {
      const deleteQuery = `DELETE FROM suppliers WHERE supplier_id = ?`;
  
      try {
        const [result] = await db.query(deleteQuery, [supplier_id]);
        return result.affectedRows > 0;
      } catch (error) {
        throw new Error(`Error deleting supplier: ${error.message}`);
      }
    }
  }
  
  module.exports = Suppliers;
  
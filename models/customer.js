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

// Promisify the pool for async/await support
const db = pool.promise();
class Customers {
    static async createCustomersTable() {
      const createTableQuery = `
        CREATE TABLE IF NOT EXISTS customers (
          customer_id INT(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
          customer_name VARCHAR(100) NOT NULL,
          customer_email VARCHAR(100) NOT NULL,
          customer_phone VARCHAR(20) NOT NULL,
          customer_location TEXT NOT NULL,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
      `;
      await db.query(createTableQuery);
      console.log('Customers table created or already exists.');
    }
  
    static async createCustomer(customerData) {
      const insertCustomerQuery = `
        INSERT INTO customers (customer_name, customer_email, customer_phone, customer_location)
        VALUES (?, ?, ?, ?)
      `;
      const { customer_name, customer_email, customer_phone, customer_location } = customerData;
  
      try {
        const [result] = await db.query(insertCustomerQuery, [customer_name, customer_email, customer_phone, customer_location]);
        return { customer_id: result.insertId };
      } catch (error) {
        throw new Error(`Error creating customer: ${error.message}`);
      }
    }
  
    static async getCustomerById(customer_id) {
      const query = `SELECT * FROM customers WHERE customer_id = ?`;
  
      try {
        const [rows] = await db.query(query, [customer_id]);
        if (rows.length === 0) throw new Error('Customer not found.');
        return rows[0];
      } catch (error) {
        throw new Error(`Error fetching customer: ${error.message}`);
      }
    }
  
    static async getAllCustomers() {
      const query = `SELECT * FROM customers ORDER BY created_at DESC`;
  
      try {
        const [rows] = await db.query(query);
        return rows;
      } catch (error) {
        throw new Error(`Error fetching all customers: ${error.message}`);
      }
    }
  
    static async updateCustomer(customer_id, updatedData) {
      const { customer_name, customer_email, customer_phone, customer_location } = updatedData;
  
      const updateQuery = `
        UPDATE customers
        SET customer_name = ?, customer_email = ?, customer_phone = ?, customer_location = ?
        WHERE customer_id = ?
      `;
      
      try {
        const [result] = await db.query(updateQuery, [customer_name, customer_email, customer_phone, customer_location, customer_id]);
        return result.affectedRows > 0;
      } catch (error) {
        throw new Error(`Error updating customer: ${error.message}`);
      }
    }
  
    static async deleteCustomer(customer_id) {
      const deleteQuery = `DELETE FROM customers WHERE customer_id = ?`;
  
      try {
        const [result] = await db.query(deleteQuery, [customer_id]);
        return result.affectedRows > 0;
      } catch (error) {
        throw new Error(`Error deleting customer: ${error.message}`);
      }
    }
  }
  
  module.exports = Customers;
  
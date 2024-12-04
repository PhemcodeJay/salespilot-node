const mysql = require('mysql2');

// Create database connection pool
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'your_database_name',
  charset: 'utf8mb4',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Promisify the pool for async/await support
const db = pool.promise();

class Invoices {
    static async createInvoicesTable() {
      const createTableQuery = `
        CREATE TABLE IF NOT EXISTS invoices (
          invoice_id INT(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
          invoice_number VARCHAR(50) NOT NULL,
          customer_name VARCHAR(255) NOT NULL,
          invoice_description TEXT DEFAULT NULL,
          order_date DATE NOT NULL,
          order_status ENUM('Paid','Unpaid') NOT NULL,
          order_id VARCHAR(50) NOT NULL,
          delivery_address TEXT NOT NULL,
          mode_of_payment VARCHAR(255) NOT NULL,
          due_date DATE NOT NULL,
          subtotal DECIMAL(10,2) NOT NULL,
          discount DECIMAL(5,2) NOT NULL,
          total_amount DECIMAL(10,2) GENERATED ALWAYS AS (subtotal - subtotal * (discount / 100)) STORED,
          UNIQUE(invoice_number)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
      `;
      await db.query(createTableQuery);
      console.log('Invoices table created or already exists.');
    }
  
    static async createInvoiceItemsTable() {
      const createTableQuery = `
        CREATE TABLE IF NOT EXISTS invoice_items (
          invoice_items_id INT(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
          invoice_id INT(11) NOT NULL,
          item_name VARCHAR(255) NOT NULL,
          qty INT(11) NOT NULL,
          price DECIMAL(10,2) NOT NULL,
          total DECIMAL(10,2) GENERATED ALWAYS AS (qty * price) STORED,
          FOREIGN KEY (invoice_id) REFERENCES invoices(invoice_id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
      `;
      await db.query(createTableQuery);
      console.log('Invoice Items table created or already exists.');
    }
  
    static async createInvoice(invoiceData) {
      const insertInvoiceQuery = `
        INSERT INTO invoices (invoice_number, customer_name, invoice_description, order_date, order_status, order_id, delivery_address, mode_of_payment, due_date, subtotal, discount)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      const {
        invoice_number,
        customer_name,
        invoice_description,
        order_date,
        order_status,
        order_id,
        delivery_address,
        mode_of_payment,
        due_date,
        subtotal,
        discount,
      } = invoiceData;
  
      try {
        const [result] = await db.query(insertInvoiceQuery, [
          invoice_number,
          customer_name,
          invoice_description,
          order_date,
          order_status,
          order_id,
          delivery_address,
          mode_of_payment,
          due_date,
          subtotal,
          discount,
        ]);
        return { invoice_id: result.insertId };
      } catch (error) {
        throw new Error(`Error creating invoice: ${error.message}`);
      }
    }
  
    static async createInvoiceItem(itemData) {
      const insertItemQuery = `
        INSERT INTO invoice_items (invoice_id, item_name, qty, price)
        VALUES (?, ?, ?, ?)
      `;
      const { invoice_id, item_name, qty, price } = itemData;
  
      try {
        await db.query(insertItemQuery, [invoice_id, item_name, qty, price]);
      } catch (error) {
        throw new Error(`Error creating invoice item: ${error.message}`);
      }
    }
  
    static async getInvoiceById(invoice_id) {
      const invoiceQuery = `SELECT * FROM invoices WHERE invoice_id = ?`;
      const itemsQuery = `SELECT * FROM invoice_items WHERE invoice_id = ?`;
  
      try {
        const [invoiceRows] = await db.query(invoiceQuery, [invoice_id]);
        if (invoiceRows.length === 0) throw new Error('Invoice not found.');
  
        const [itemRows] = await db.query(itemsQuery, [invoice_id]);
        return { ...invoiceRows[0], items: itemRows };
      } catch (error) {
        throw new Error(`Error fetching invoice: ${error.message}`);
      }
    }
  
    static async deleteInvoice(invoice_id) {
      const deleteQuery = `DELETE FROM invoices WHERE invoice_id = ?`;
  
      try {
        const [result] = await db.query(deleteQuery, [invoice_id]);
        return result.affectedRows > 0;
      } catch (error) {
        throw new Error(`Error deleting invoice: ${error.message}`);
      }
    }
  }
  
  module.exports = Invoices;
  
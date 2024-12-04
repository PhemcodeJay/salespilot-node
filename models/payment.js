const mysql = require('mysql2');

// Create database connection pool
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'dbs13455438',
  charset: 'utf8',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Promisify the pool for async/await support
const db = pool.promise();

class Payment {
  static async createPaymentsTable() {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS payments (
        id INT(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
        user_id INT(11) NOT NULL,
        payment_method ENUM('paypal', 'binance', 'mpesa', 'naira') NOT NULL,
        payment_proof VARCHAR(255) NOT NULL,
        payment_amount DECIMAL(10, 2) NOT NULL,
        payment_status ENUM('pending', 'completed', 'failed') DEFAULT 'pending',
        payment_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
        subscription_id INT(11) DEFAULT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;
    `;
    await db.query(createTableQuery);
    console.log('Payments table created or already exists.');
  }

  static async createPayment(paymentData) {
    const insertQuery = `
      INSERT INTO payments 
      (user_id, payment_method, payment_proof, payment_amount, payment_status, subscription_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    const { user_id, payment_method, payment_proof, payment_amount, payment_status, subscription_id } = paymentData;

    try {
      const [result] = await db.query(insertQuery, [user_id, payment_method, payment_proof, payment_amount, payment_status, subscription_id]);
      return { id: result.insertId };
    } catch (error) {
      throw new Error(`Error creating payment: ${error.message}`);
    }
  }

  static async getPaymentById(id) {
    const query = `SELECT * FROM payments WHERE id = ?`;

    try {
      const [rows] = await db.query(query, [id]);
      if (rows.length === 0) throw new Error('Payment not found.');
      return rows[0];
    } catch (error) {
      throw new Error(`Error fetching payment: ${error.message}`);
    }
  }

  static async getPaymentsByUserId(user_id) {
    const query = `SELECT * FROM payments WHERE user_id = ? ORDER BY payment_date DESC`;

    try {
      const [rows] = await db.query(query, [user_id]);
      return rows;
    } catch (error) {
      throw new Error(`Error fetching payments for user: ${error.message}`);
    }
  }

  static async updatePaymentStatus(id, paymentStatus) {
    const updateQuery = `
      UPDATE payments
      SET payment_status = ?
      WHERE id = ?
    `;

    try {
      const [result] = await db.query(updateQuery, [paymentStatus, id]);
      return result.affectedRows > 0;
    } catch (error) {
      throw new Error(`Error updating payment status: ${error.message}`);
    }
  }

  static async deletePayment(id) {
    const deleteQuery = `DELETE FROM payments WHERE id = ?`;

    try {
      const [result] = await db.query(deleteQuery, [id]);
      return result.affectedRows > 0;
    } catch (error) {
      throw new Error(`Error deleting payment record: ${error.message}`);
    }
  }
}

module.exports = Payment;

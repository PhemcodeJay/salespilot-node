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

class Expenses {
    static async createExpensesTable() {
      const createTableQuery = `
        CREATE TABLE IF NOT EXISTS expenses (
          expense_id INT(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
          description TEXT NOT NULL,
          amount DECIMAL(10,2) NOT NULL,
          expense_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          created_by VARCHAR(255) NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
      `;
      await db.query(createTableQuery);
      console.log('Expenses table created or already exists.');
    }
  
    static async createExpense(expenseData) {
      const insertExpenseQuery = `
        INSERT INTO expenses (description, amount, created_by)
        VALUES (?, ?, ?)
      `;
      const { description, amount, created_by } = expenseData;
  
      try {
        const [result] = await db.query(insertExpenseQuery, [description, amount, created_by]);
        return { expense_id: result.insertId };
      } catch (error) {
        throw new Error(`Error creating expense: ${error.message}`);
      }
    }
  
    static async getExpenseById(expense_id) {
      const query = `SELECT * FROM expenses WHERE expense_id = ?`;
  
      try {
        const [rows] = await db.query(query, [expense_id]);
        if (rows.length === 0) throw new Error('Expense not found.');
        return rows[0];
      } catch (error) {
        throw new Error(`Error fetching expense: ${error.message}`);
      }
    }
  
    static async getAllExpenses() {
      const query = `SELECT * FROM expenses ORDER BY expense_date DESC`;
  
      try {
        const [rows] = await db.query(query);
        return rows;
      } catch (error) {
        throw new Error(`Error fetching all expenses: ${error.message}`);
      }
    }
  
    static async updateExpense(expense_id, updatedData) {
      const { description, amount, created_by } = updatedData;
  
      const updateQuery = `
        UPDATE expenses
        SET description = ?, amount = ?, created_by = ?
        WHERE expense_id = ?
      `;
      
      try {
        const [result] = await db.query(updateQuery, [description, amount, created_by, expense_id]);
        return result.affectedRows > 0;
      } catch (error) {
        throw new Error(`Error updating expense: ${error.message}`);
      }
    }
  
    static async deleteExpense(expense_id) {
      const deleteQuery = `DELETE FROM expenses WHERE expense_id = ?`;
  
      try {
        const [result] = await db.query(deleteQuery, [expense_id]);
        return result.affectedRows > 0;
      } catch (error) {
        throw new Error(`Error deleting expense: ${error.message}`);
      }
    }
  }
  
  module.exports = Expenses;
  
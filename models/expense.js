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
  // Method to create the expenses table
  static async createExpensesTable() {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS expenses (
        id INT(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
        description TEXT NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        category VARCHAR(255) NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
    `;
    
    try {
      await db.query(createTableQuery);
      console.log('Expenses table created or already exists.');
    } catch (error) {
      console.error('Error creating expenses table:', error.message);
      throw error;
    }
  }

  // Method to add a new expense
  static async createExpense(expenseData) {
    const { description, amount, category } = expenseData;
    const insertExpenseQuery = `
      INSERT INTO expenses (description, amount, category)
      VALUES (?, ?, ?)
    `;

    try {
      const [result] = await db.query(insertExpenseQuery, [description, amount, category]);
      return { id: result.insertId }; // Returning the inserted expense ID
    } catch (error) {
      throw new Error(`Error creating expense: ${error.message}`);
    }
  }

  // Method to get a specific expense by its ID
  static async getExpenseById(expenseId) {
    const query = 'SELECT * FROM expenses WHERE id = ?';

    try {
      const [rows] = await db.query(query, [expenseId]);
      if (rows.length === 0) throw new Error('Expense not found.');
      return rows[0];
    } catch (error) {
      throw new Error(`Error fetching expense: ${error.message}`);
    }
  }

  // Method to get all expenses
  static async getAllExpenses() {
    const query = 'SELECT * FROM expenses ORDER BY date DESC';

    try {
      const [rows] = await db.query(query);
      return rows;
    } catch (error) {
      throw new Error(`Error fetching all expenses: ${error.message}`);
    }
  }

  // Method to update an existing expense
  static async updateExpense(expenseId, updatedData) {
    const { description, amount, category } = updatedData;

    const updateQuery = `
      UPDATE expenses
      SET description = ?, amount = ?, category = ?
      WHERE id = ?
    `;

    try {
      const [result] = await db.query(updateQuery, [description, amount, category, expenseId]);
      return result.affectedRows > 0; // Returns true if an expense was updated
    } catch (error) {
      throw new Error(`Error updating expense: ${error.message}`);
    }
  }

  // Method to delete an expense by its ID
  static async deleteExpense(expenseId) {
    const deleteQuery = 'DELETE FROM expenses WHERE id = ?';

    try {
      const [result] = await db.query(deleteQuery, [expenseId]);
      return result.affectedRows > 0; // Returns true if an expense was deleted
    } catch (error) {
      throw new Error(`Error deleting expense: ${error.message}`);
    }
  }

  // Method to calculate total expenses
  static async getTotalExpenses() {
    const query = 'SELECT SUM(amount) AS total_expenses FROM expenses';

    try {
      const [rows] = await db.query(query);
      return rows[0].total_expenses;
    } catch (error) {
      throw new Error(`Error fetching total expenses: ${error.message}`);
    }
  }
}

module.exports = Expenses;

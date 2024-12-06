const mysql = require('mysql2'); // Assuming you're using mysql2 for database connection
const jwt = require('jsonwebtoken');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const verifyToken = require('../verifyToken');

// Create a connection pool to the database
const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'dbs13455438',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Export the pool for use in other files
module.exports = pool;

// Use the pool for queries
const db = pool; 


// Fetch user details by token
const fetchUserInfo = (username) => {
    return new Promise((resolve, reject) => {
        db.query('SELECT username, email, date, phone, location, user_image FROM users WHERE username = ?', [username], (err, results) => {
            if (err) return reject("Error fetching user info");
            if (results.length === 0) return reject("User not found.");
            resolve(results[0]);
        });
    });
};

// Fetch all expenses
const getAllExpenses = async (req, res) => {
    try {
        const [results] = await db.query('SELECT * FROM expenses ORDER BY date DESC');
        return res.json(results);
    } catch (err) {
        return res.status(500).json({ message: 'Database error', error: err.message });
    }
};

// Fetch an expense by its ID
const getExpenseById = async (req, res) => {
    const expenseId = req.params.id;

    try {
        const [results] = await db.query('SELECT * FROM expenses WHERE id = ?', [expenseId]);

        if (results.length === 0) {
            return res.status(404).json({ message: 'Expense not found' });
        }

        return res.json(results[0]);
    } catch (err) {
        return res.status(500).json({ message: 'Database error', error: err.message });
    }
};

// Add a new expense
const addExpense = async (req, res) => {
    const { description, amount, date, category } = req.body;

    // Basic validation (ensure that all required fields are provided)
    if (!description || !amount || !date || !category) {
        return res.status(400).json({ message: 'All fields are required' });
    }

    const newExpense = { description, amount, date, category };

    try {
        const [result] = await db.query('INSERT INTO expenses SET ?', [newExpense]);
        return res.status(201).json({ message: 'Expense added successfully', expenseId: result.insertId });
    } catch (err) {
        return res.status(500).json({ message: 'Database error', error: err.message });
    }
};

// Update an existing expense
const updateExpense = async (req, res) => {
    const expenseId = req.params.id;
    const { description, amount, date, category } = req.body;

    // Basic validation (ensure that all required fields are provided)
    if (!description || !amount || !date || !category) {
        return res.status(400).json({ message: 'All fields are required' });
    }

    const updatedExpense = { description, amount, date, category };

    try {
        const [result] = await db.query('UPDATE expenses SET ? WHERE id = ?', [updatedExpense, expenseId]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Expense not found' });
        }

        return res.json({ message: 'Expense updated successfully' });
    } catch (err) {
        return res.status(500).json({ message: 'Database error', error: err.message });
    }
};

// Delete an expense
const deleteExpense = async (req, res) => {
    const expenseId = req.params.id;

    try {
        const [result] = await db.query('DELETE FROM expenses WHERE id = ?', [expenseId]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Expense not found' });
        }

        return res.json({ message: 'Expense deleted successfully' });
    } catch (err) {
        return res.status(500).json({ message: 'Database error', error: err.message });
    }
};

// Get total expenses (for analytics or reporting)
const getTotalExpenses = async (req, res) => {
    try {
        const [results] = await db.query('SELECT SUM(amount) AS total_expenses FROM expenses');
        return res.json({ total_expenses: results[0].total_expenses });
    } catch (err) {
        return res.status(500).json({ message: 'Database error', error: err.message });
    }
};

// Generate PDF report of all expenses
const generateExpensesPdf = async (req, res) => {
    try {
        // Fetch all expenses
        const [expenses] = await db.query('SELECT * FROM expenses ORDER BY date DESC');

        if (expenses.length === 0) {
            return res.status(404).json({ message: 'No expenses found' });
        }

        // Create the reports directory if it doesn't exist
        const reportsDir = path.join(__dirname, '..', 'reports');
        if (!fs.existsSync(reportsDir)) {
            fs.mkdirSync(reportsDir);
        }

        // Create a new PDF document
        const doc = new PDFDocument();
        
        // Set the file name and path
        const filePath = path.join(reportsDir, `expenses_report_${Date.now()}.pdf`);

        // Pipe the document to a file
        doc.pipe(fs.createWriteStream(filePath));

        // Title and headers
        doc.fontSize(18).text('Expense Report', { align: 'center' });
        doc.moveDown();
        doc.fontSize(12).text(`Date Generated: ${new Date().toLocaleString()}`, { align: 'center' });
        doc.moveDown();
        
        doc.text('--------------------------------------', { align: 'center' });
        doc.moveDown();
        
        doc.text('ID | Description | Amount | Date | Category');
        doc.text('--------------------------------------');
        
        // Add expenses data to the PDF
        expenses.forEach(expense => {
            doc.text(`${expense.id} | ${expense.description} | $${expense.amount} | ${expense.date} | ${expense.category}`);
        });

        // End and save the PDF document
        doc.end();

        // Send the response with the file path or download option
        res.status(200).json({ message: 'PDF report generated successfully', filePath: filePath });
    } catch (err) {
        return res.status(500).json({ message: 'Error generating PDF', error: err.message });
    }
};

module.exports = {
    getAllExpenses,
    getExpenseById,
    addExpense,
    updateExpense,
    deleteExpense,
    getTotalExpenses,
    generateExpensesPdf
};

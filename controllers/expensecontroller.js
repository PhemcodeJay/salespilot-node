// controllers/expenseController.js
const db = require('../config/db'); // MySQL connection

// Function to fetch all expenses
const getAllExpenses = (req, res) => {
    db.query('SELECT * FROM expenses ORDER BY date DESC', (err, results) => {
        if (err) {
            return res.status(500).json({ message: 'Database error', error: err });
        }
        return res.json(results);
    });
};

// Function to fetch an expense by its ID
const getExpenseById = (req, res) => {
    const expenseId = req.params.id;

    db.query('SELECT * FROM expenses WHERE id = ?', [expenseId], (err, results) => {
        if (err) {
            return res.status(500).json({ message: 'Database error', error: err });
        }

        if (results.length === 0) {
            return res.status(404).json({ message: 'Expense not found' });
        }

        return res.json(results[0]);
    });
};

// Function to add a new expense
const addExpense = (req, res) => {
    const { description, amount, date, category } = req.body;

    // Basic validation (ensure that all required fields are provided)
    if (!description || !amount || !date || !category) {
        return res.status(400).json({ message: 'All fields are required' });
    }

    const newExpense = {
        description,
        amount,
        date,
        category
    };

    db.query('INSERT INTO expenses SET ?', newExpense, (err, results) => {
        if (err) {
            return res.status(500).json({ message: 'Database error', error: err });
        }

        return res.status(201).json({ message: 'Expense added successfully', expenseId: results.insertId });
    });
};

// Function to update an existing expense
const updateExpense = (req, res) => {
    const expenseId = req.params.id;
    const { description, amount, date, category } = req.body;

    // Basic validation (ensure that all required fields are provided)
    if (!description || !amount || !date || !category) {
        return res.status(400).json({ message: 'All fields are required' });
    }

    const updatedExpense = {
        description,
        amount,
        date,
        category
    };

    db.query('UPDATE expenses SET ? WHERE id = ?', [updatedExpense, expenseId], (err, results) => {
        if (err) {
            return res.status(500).json({ message: 'Database error', error: err });
        }

        if (results.affectedRows === 0) {
            return res.status(404).json({ message: 'Expense not found' });
        }

        return res.json({ message: 'Expense updated successfully' });
    });
};

// Function to delete an expense
const deleteExpense = (req, res) => {
    const expenseId = req.params.id;

    db.query('DELETE FROM expenses WHERE id = ?', [expenseId], (err, results) => {
        if (err) {
            return res.status(500).json({ message: 'Database error', error: err });
        }

        if (results.affectedRows === 0) {
            return res.status(404).json({ message: 'Expense not found' });
        }

        return res.json({ message: 'Expense deleted successfully' });
    });
};

// Function to get total expenses (for analytics or reporting)
const getTotalExpenses = (req, res) => {
    db.query('SELECT SUM(amount) AS total_expenses FROM expenses', (err, results) => {
        if (err) {
            return res.status(500).json({ message: 'Database error', error: err });
        }

        return res.json({ total_expenses: results[0].total_expenses });
    });
};

module.exports = {
    getAllExpenses,
    getExpenseById,
    addExpense,
    updateExpense,
    deleteExpense,
    getTotalExpenses
};

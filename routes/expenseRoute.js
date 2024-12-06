// expenseRoute.js
const express = require('express');
const path = require('path');
const expenseController = require('../controllers/expensecontroller');  // Adjust path if necessary
const verifyToken = require('../verifyToken');  // Import the verifyToken function

const router = express.Router();

// Serve static files (CSS, JS, images, etc.) from the 'public' folder
router.use(express.static(path.join(__dirname, '../public')));

// Serve the 'page-add-expenses.html' page to add an expense
router.get('/add-expense', verifyToken, (req, res) => {
    const filePath = path.join(__dirname, '..', 'public', 'page-add-expenses.html');
    res.sendFile(filePath);
});

// Serve the 'page-list-expenses.html' page to list all expenses
router.get('/list-expenses', verifyToken, async (req, res) => {
    try {
        const expenses = await expenseController.getAllExpenses(req, res);
        res.render('page-list-expenses', { expenses });
    } catch (err) {
        console.error("Error fetching expenses: ", err);
        res.status(500).json({ message: 'Error fetching expenses' });
    }
});

// Handle expense actions (e.g., save, update, delete, PDF generation)
// Adding new expense
router.post('/expense', verifyToken, expenseController.addExpense);

// Updating an existing expense
router.put('/expense/:id', verifyToken, expenseController.updateExpense);

// Deleting an expense
router.delete('/expense/:id', verifyToken, expenseController.deleteExpense);

// Generate PDF report of all expenses
router.get('/expenses/pdf', verifyToken, expenseController.generateExpensesPdf);

// Fetch all expenses (for use in analytics or as JSON for list display)
router.get('/expenses', verifyToken, async (req, res) => {
    try {
        const expenses = await expenseController.getAllExpenses(req, res);
        res.json(expenses);
    } catch (err) {
        console.error("Error fetching expenses: ", err);
        res.status(500).json({ message: 'Error fetching expenses' });
    }
});

// Fetch a specific expense by its ID
router.get('/expense/:id', verifyToken, expenseController.getExpenseById);

// Get total expenses (for reporting or analytics)
router.get('/expenses/total', verifyToken, expenseController.getTotalExpenses);

module.exports = router;

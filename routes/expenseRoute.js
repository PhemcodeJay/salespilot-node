const express = require('express');
const path = require('path');
const expenseController = require('../controllers/expenseController');  // Adjust path if necessary
const verifyToken = require('../middleware/verifyToken');  // Assuming you have a middleware to verify JWT

const router = express.Router();

// Serve static files (CSS, JS, images, etc.) from the 'public' folder
router.use(express.static(path.join(__dirname, '../public')));

// Serve the 'page-add-expenses.html' page to add an expense
router.get('/add-expense', verifyToken, (req, res) => {
    const filePath = path.join(__dirname, '..', 'public', 'page-add-expenses.html'); // Adjust path as needed
    res.sendFile(filePath);
});

// Serve the 'page-list-expenses.html' page to list all expenses
router.get('/list-expenses', verifyToken, async (req, res) => {
    try {
        const expenses = await expenseController.getAllExpenses(); // Fetch all expenses
        res.render('page-list-expenses', { expenses }); // You can modify this if you prefer sending JSON instead
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

// Fetch all expenses (to use for analytics or list display)
router.get('/expenses', verifyToken, expenseController.getAllExpenses);

// Fetch a specific expense by its ID
router.get('/expense/:id', verifyToken, expenseController.getExpenseById);

// Get total expenses (for reporting or analytics)
router.get('/expenses/total', verifyToken, expenseController.getTotalExpenses);

module.exports = router;

const express = require('express');
const path = require('path');
const expenseController = require('./controllers/expenseController'); // Import the expense controller

const router = express.Router();

// Serve static files from the 'public' folder
router.use(express.static(path.join(__dirname, '../public')));

// Serve the page to add an expense
router.get('/page-add-expense', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/page-add-expense.html'));
});

// Serve the page to list all expenses
router.get('/page-list-expenses', async (req, res) => {
    try {
        const expenses = await expenseController.getAllExpenses(); // Fetch all expenses
        res.render('page-list-expenses', { expenses }); // Render the list of expenses
    } catch (err) {
        console.error("Error fetching expenses: ", err);
        res.status(500).json({ message: 'Error fetching expenses' });
    }
});

// Handle expense actions (e.g., save, delete, update, PDF generation)
router.post('/handle-expense-actions', expenseController.addExpense); // Handle adding expense
router.put('/handle-expense-update/:id', expenseController.updateExpense); // Handle updating expense
router.delete('/handle-expense-delete/:id', expenseController.deleteExpense); // Handle deleting expense

// Generate PDF report of all expenses
router.get('/generate-expenses-pdf', expenseController.generateExpensesPdf);

module.exports = router;

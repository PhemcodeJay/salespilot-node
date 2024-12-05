const express = require('express');
const router = express.Router();
const expenseController = require('../controllers/expenseController'); // Import expense controller


// MySQL connection setup
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
});


// Middleware to check authentication (if needed)
const checkAuth = (req, res, next) => {
    const token = req.cookies['auth_token'];
    if (!token) {
        return res.status(403).json({ message: 'No token provided' });
    }
    // Assuming JWT is used
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;  // Store user info in the request object for further use
        next();
    } catch (err) {
        console.error('Token verification failed:', err);
        return res.status(403).json({ message: 'Invalid or expired token' });
    }
};

// Route to display list of all expenses (page-list-expenses.html)
router.get('/list', checkAuth, async (req, res) => {
    try {
        const expenses = await expenseController.getAllExpenses();
        res.render('page-list-expenses', { expenses });
    } catch (err) {
        console.error("Error fetching expenses:", err);
        res.status(500).json({ message: 'Error fetching expenses' });
    }
});

// Route to show the add expense form (page-add-expense.html)
router.get('/add', checkAuth, (req, res) => {
    res.render('page-add-expense'); // Renders the form to add an expense
});

// Route to handle adding, updating, and deleting expenses
router.post('/actions', checkAuth, async (req, res) => {
    const { action, expenseId, description, amount, date, category } = req.body;

    try {
        if (action === 'add') {
            await expenseController.addExpense(req, res);
            return res.redirect('/expenses/list'); // Redirect to expense list after adding
        }

        if (action === 'delete') {
            await expenseController.deleteExpense(req, res);
            return res.redirect('/expenses/list'); // Redirect to expense list after deleting
        }

        if (action === 'update') {
            await expenseController.updateExpense(req, res);
            return res.redirect('/expenses/list'); // Redirect to expense list after updating
        }
    } catch (err) {
        console.error("Error handling expense action:", err);
        res.status(500).json({ message: 'Error handling expense action' });
    }
});

module.exports = router;

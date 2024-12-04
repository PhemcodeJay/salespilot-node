const express = require('express');
const path = require('path');
const customerController = require('./controllers/customerController'); // Import the customer controller

const router = express.Router();

// Serve static files from the 'public' folder
router.use(express.static(path.join(__dirname, '../public')));

// Serve the page to add a customer
router.get('/page-add-customers', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/page-add-customers.html'));
});

// Serve the page to list all customers
router.get('/page-list-customers', async (req, res) => {
    try {
        const customers = await customerController.fetchAllCustomers(); // Fetch all customers
        res.render('page-list-customers', { customers }); // Render the list of customers
    } catch (err) {
        console.error("Error fetching customers: ", err);
        res.status(500).json({ message: 'Error fetching customers' });
    }
});

// Handle customer actions (e.g., save, delete, update, PDF generation)
router.post('/handle-customer-actions', customerController.handleCustomerActions);

module.exports = router;

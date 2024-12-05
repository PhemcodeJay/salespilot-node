const express = require('express');
const router = express.Router();
const { Customer } = require('../models'); // Assuming Sequelize is used for database models
const jwt = require('jsonwebtoken');

// Middleware to check authentication (Example, assuming JWT is used)
const checkAuth = (req, res, next) => {
    const token = req.cookies['auth_token'];
    if (!token) {
        return res.status(403).json({ message: 'No token provided' });
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;  // Store user info in the request object for further use
        next();
    } catch (err) {
        console.error('Token verification failed:', err);
        return res.status(403).json({ message: 'Invalid or expired token' });
    }
};

// Route to display list of customers (page-list-customers.html)
router.get('/list', checkAuth, async (req, res) => {
    try {
        // Fetch all customers from the database
        const customers = await Customer.findAll({
            attributes: ['customer_id', 'customer_name', 'customer_email', 'customer_phone', 'customer_location']
        });

        // Render the customers list page
        res.render('page-list-customers', { customers });
    } catch (err) {
        console.error("Error fetching customers:", err);
        res.status(500).json({ message: 'Error fetching customers' });
    }
});

// Route to display add customer form (page-add-customers.html)
router.get('/add', checkAuth, (req, res) => {
    // Render the add customer form page
    res.render('page-add-customers');
});

// Route to handle customer actions (adding, updating, deleting)
router.post('/actions', checkAuth, async (req, res) => {
    try {
        const { action, customer_id, customer_name, customer_email, customer_phone, customer_location } = req.body;

        if (action === 'add') {
            // Add a new customer
            await Customer.create({
                customer_name,
                customer_email,
                customer_phone,
                customer_location
            });
            return res.redirect('/customers/list');  // Redirect to the list page after adding
        }

        if (action === 'delete') {
            // Delete a customer by customer_id
            await Customer.destroy({
                where: { customer_id }
            });
            return res.redirect('/customers/list');  // Redirect to the list page after deletion
        }

        if (action === 'update') {
            // Update existing customer details
            await Customer.update(
                { 
                    customer_name,
                    customer_email,
                    customer_phone,
                    customer_location
                },
                {
                    where: { customer_id }
                }
            );
            return res.redirect('/customers/list');  // Redirect to the list page after updating
        }

    } catch (err) {
        console.error("Error handling customer action:", err);
        res.status(500).json({ message: 'Error handling customer action' });
    }
});

module.exports = router;

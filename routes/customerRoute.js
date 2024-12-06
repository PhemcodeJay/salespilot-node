const express = require('express');
const router = express.Router();
const customerController = require('./controllers/customerController');  // Assuming your controller file is named customerController.js

// Middleware to protect routes (Optional, if using JWT)
const verifyToken = require('../middleware/verifyToken');

// Get customer dashboard (list all customers)
router.get('/customers', verifyToken, customerController.customerController);

// Handle customer actions (CRUD)
router.post('/customer/actions', verifyToken, customerController.handleCustomerActions);

// Export customer details to PDF
router.get('/customer/pdf/:customer_id', verifyToken, async (req, res) => {
    const { customer_id } = req.params;
    try {
        const doc = await customerController.exportCustomerToPDF(customer_id);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=customer_${customer_id}.pdf`);
        doc.pipe(res);
    } catch (err) {
        console.error("Error exporting PDF: ", err);
        res.status(500).json({ message: 'Error exporting PDF' });
    }
});

// Exported router for use in main app file
module.exports = router;

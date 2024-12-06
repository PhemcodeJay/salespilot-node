const express = require('express');
const path = require('path'); // Add this to handle path resolution
const fs = require('fs'); // Required for handling file system operations
const router = express.Router();
const customerController = require('./controllers/customerController'); // Import the customer controller
const verifyToken = require('../middleware/verifyToken'); // Middleware to verify JWT

// Serve static files (CSS, JS, images, etc.) from the 'public' folder
router.use(express.static(path.join(__dirname, '../public')));

// Serve the 'page-add-customer.html' page to add a customer
router.get('/add-customer', verifyToken, (req, res) => {
    const filePath = path.join(__dirname, '..', 'public', 'page-add-customer.html'); // Adjust path as needed
    res.sendFile(filePath);
});

// Serve the 'page-list-customer.html' page to list all customers
router.get('/list-customer', verifyToken, async (req, res) => {
    try {
        const customers = await customerController.getAllCustomers(); // Make sure the method is 'getAllCustomers' (fixed typo)
        res.render('page-list-customer', { customers }); // This assumes you're using a view engine like EJS, Pug, etc.
    } catch (err) {
        console.error("Error fetching customers: ", err);
        res.status(500).json({ message: 'Error fetching customers' });
    }
});

// Handle customer actions (CRUD operations)
router.post('/customer/actions', verifyToken, customerController.handleCustomerActions);

// Export customer details to PDF
router.get('/customer/pdf/:customer_id', verifyToken, async (req, res) => {
    const { customer_id } = req.params;

    try {
        // Call the controller method to export customer data to PDF
        const doc = await customerController.exportCustomerToPDF(customer_id);
        const filePath = path.join(__dirname, '..', 'temp', `customer_${customer_id}.pdf`); // Path to save the PDF

        // Pipe the PDF content to a temporary file
        doc.pipe(fs.createWriteStream(filePath));

        // Once the file is written, send it as a downloadable response
        doc.on('finish', () => {
            res.download(filePath, `customer_${customer_id}.pdf`, (err) => {
                if (err) {
                    console.error('Error sending file:', err);
                    return res.status(500).json({ message: 'Error exporting PDF' });
                }
                // Clean up the temporary file after sending it
                fs.unlinkSync(filePath);
            });
        });

        // Finalize the PDF document
        doc.end();
    } catch (err) {
        console.error("Error exporting PDF: ", err);
        res.status(500).json({ message: 'Error exporting PDF' });
    }
});

// Export the router for use in the main app file
module.exports = router;

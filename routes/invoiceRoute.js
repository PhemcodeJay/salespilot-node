const express = require('express');
const path = require('path');
const invoiceController = require('../controllers/invoiceController'); // Import the invoice controller

const router = express.Router();

// Serve static files from the 'public' folder
router.use(express.static(path.join(__dirname, '../public')));

// Serve the page to add an invoice (invoice-form.html)
router.get('/invoice-form', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/invoice-form.html'));
});

// Serve the page to list all invoices (page-list-invoices.html)
router.get('/page-invoices', async (req, res) => {
    try {
        const invoices = await invoiceController.getAllInvoices(); // Fetch all invoices
        res.sendFile(path.join(__dirname, '../public/page-invoices.html')); // Serve static page for listing invoices
    } catch (err) {
        console.error("Error fetching invoices: ", err);
        res.status(500).json({ message: 'Error fetching invoices' });
    }
});

// Handle invoice actions (e.g., save, delete, update, PDF generation)
router.post('/handle-invoice-actions', invoiceController.addInvoice); // Handle adding invoice
router.put('/handle-invoice-update/:id', invoiceController.updateInvoice); // Handle updating invoice
router.delete('/delete-invoice/:id', invoiceController.deleteInvoice); // Handle deleting invoice
router.get('/generate-invoices-pdf', invoiceController.generateInvoicesPdf); // Handle PDF generation for all invoices

module.exports = router;

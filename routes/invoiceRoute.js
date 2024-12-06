const express = require('express');
const path = require('path');
const invoiceController = require('./controllers/invoicecontroller'); // Import the invoice controller

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
router.delete('/handle-invoice-delete/:id', invoiceController.deleteInvoice); // Handle deleting invoice

// Generate PDF report of all invoices
router.get('/generate-invoices-pdf', invoiceController.generateInvoicesPdf);

// API Routes for Invoice CRUD operations

// Create Invoice Route
router.post('/invoice', (req, res) => {
    const invoiceData = req.body.invoiceData;  // Invoice data
    const itemsData = req.body.itemsData;  // Array of items

    invoiceController.createInvoice(invoiceData, itemsData, (err, invoiceId) => {
        if (err) {
            return res.status(500).json({ message: 'Error creating invoice', error: err });
        }
        res.status(201).json({ message: 'Invoice created successfully', invoiceId });
    });
});

// Get Invoice Route
router.get('/invoice/:invoiceId', (req, res) => {
    const invoiceId = req.params.invoiceId;

    invoiceController.getInvoice(invoiceId, (err, data) => {
        if (err) {
            return res.status(500).json({ message: 'Error fetching invoice', error: err });
        }
        res.status(200).json(data);  // Sends invoice and items data
    });
});

// Update Invoice Route
router.put('/invoice/:invoiceId', (req, res) => {
    const invoiceId = req.params.invoiceId;
    const invoiceData = req.body.invoiceData;  // Updated invoice data

    invoiceController.updateInvoice(invoiceId, invoiceData, (err, result) => {
        if (err) {
            return res.status(500).json({ message: 'Error updating invoice', error: err });
        }
        res.status(200).json({ message: 'Invoice updated successfully' });
    });
});

// Delete Invoice Route
router.delete('/invoice/:invoiceId', (req, res) => {
    const invoiceId = req.params.invoiceId;

    invoiceController.deleteInvoice(invoiceId, (err) => {
        if (err) {
            return res.status(500).json({ message: 'Error deleting invoice', error: err });
        }
        res.status(200).json({ message: 'Invoice deleted successfully' });
    });
});

// Generate Invoice PDF Route
router.get('/invoice/:invoiceId/pdf', (req, res) => {
    const invoiceId = req.params.invoiceId;

    invoiceController.generateInvoicePDF(invoiceId, (err, filePath) => {
        if (err) {
            return res.status(500).json({ message: 'Error generating PDF', error: err });
        }
        res.status(200).download(filePath, `${invoiceId}.pdf`, (err) => {
            if (err) {
                console.error('Error sending PDF:', err);
            }
        });
    });
});

module.exports = router;

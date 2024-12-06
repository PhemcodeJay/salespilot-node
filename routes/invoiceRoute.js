const express = require('express');
const path = require('path');
const router = express.Router();
const { generateInvoicesPdf, createInvoice, getInvoice, updateInvoice, deleteInvoice, generateInvoicePDF } = require('../controllers/invoicecontroller');
const verifyToken = require('../verifyToken'); // Adjusted import path
const invoiceController = require('../controllers/invoicecontroller');
const authController = require('../controllers/authcontroller');


// Serve the invoice list page
router.get('/pages-invoice', verifyToken, (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'pages-invoice.html')); // Adjust the path to your HTML file
});

// Serve the invoice form page for creating or editing an invoice
router.get('/invoice-form', verifyToken, (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'invoice-form.html')); // Adjust the path to your HTML file
});

// Route to generate PDF report of all invoices
router.get('/generate-pdf', verifyToken, generateInvoicesPdf);

// Route to create a new invoice
router.post('/create', verifyToken, (req, res) => {
    const { invoiceData, itemsData } = req.body;
    createInvoice(invoiceData, itemsData, (err, invoiceId) => {
        if (err) {
            return res.status(500).json({ message: 'Error creating invoice', error: err.message });
        }
        res.status(201).json({ message: 'Invoice created successfully', invoiceId });
    });
});

// Route to get a specific invoice by ID
router.get('/:invoiceId', verifyToken, (req, res) => {
    const invoiceId = req.params.invoiceId;
    getInvoice(invoiceId, (err, data) => {
        if (err) {
            return res.status(500).json({ message: 'Error fetching invoice', error: err.message });
        }
        res.status(200).json(data);
    });
});

// Route to update an invoice
router.put('/:invoiceId', verifyToken, (req, res) => {
    const invoiceId = req.params.invoiceId;
    const invoiceData = req.body;
    updateInvoice(invoiceId, invoiceData, (err, result) => {
        if (err) {
            return res.status(500).json({ message: 'Error updating invoice', error: err.message });
        }
        res.status(200).json({ message: 'Invoice updated successfully' });
    });
});

// Route to delete an invoice
router.delete('/:invoiceId', verifyToken, (req, res) => {
    const invoiceId = req.params.invoiceId;
    deleteInvoice(invoiceId, (err) => {
        if (err) {
            return res.status(500).json({ message: 'Error deleting invoice', error: err.message });
        }
        res.status(200).json({ message: 'Invoice deleted successfully' });
    });
});

// Route to generate a PDF for a single invoice
router.get('/:invoiceId/generate-pdf', verifyToken, (req, res) => {
    const invoiceId = req.params.invoiceId;
    generateInvoicePDF(invoiceId, (err, filePath) => {
        if (err) {
            return res.status(500).json({ message: 'Error generating invoice PDF', error: err.message });
        }
        res.status(200).json({ message: 'Invoice PDF generated successfully', filePath });
    });
});

module.exports = router;

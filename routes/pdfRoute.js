const express = require('express');
const router = express.Router();
const generatePDF = require('../generatepdf');  // Your PDF generation middleware

// Route to generate and download the PDF
router.get('/generate-pdf', generatePDF);

module.exports = router;

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const productController = require('../controllers/productcontroller');
const authController = require('../controllers/authcontroller');
const pool = require('../models/db'); // Import the database connection
const session = require('express-session');
const verifyToken = require('../verifyToken');
const PDFDocument = require('pdfkit');


// Routes for chart-report
router.post('/chart-report', chart-reportController.createReport);
router.get('/chart-report/:chart-report_id', chart-reportController.getReportById);
router.get('/chart-report', chart-reportController.getAllchart-report);
router.put('/chart-report/:chart-report_id', chart-reportController.updateReport);
router.delete('/chart-report/:chart-report_id', chart-reportController.deleteReport);

// Serve 'analytics.html' page
router.get('/analytics', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/analytics-report.html'));
});

// Chart data route
router.get('/chart-data', chart-reportController.getChartData);

module.exports = router;
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

// Routes for Reports
router.post('/reports', reportsController.createReport);
router.get('/reports/:reports_id', reportsController.getReportById);
router.get('/reports', reportsController.getAllReports);
router.put('/reports/:reports_id', reportsController.updateReport);
router.delete('/reports/:reports_id', reportsController.deleteReport);

// Serve 'analytics.html' page
router.get('/analytics', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/inventory-metrics.html'));
});

// Chart data route
router.get('/chart-data', reportsController.getChartData);

module.exports = router;
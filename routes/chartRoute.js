const express = require('express');
const router = express.Router();
const path = require('path'); // For serving static files
const chartController = require('../controllers/chartcontroller');
const authController = require('../controllers/authcontroller');
const pool = require('../models/db'); // Import the database connection
const session = require('express-session');
const verifyToken = require('../verifyToken');
const PDFDocument = require('pdfkit');
const multer = require('multer');

// Routes for chart
router.post('/chart', chartController.createReport);
router.get('/chart/:chart_id', chartController.getReportById);
router.get('/chart', chartController.getAllchart);
router.put('/chart/:chart_id', chartController.updateReport);
router.delete('/chart/:chart_id', chartController.deleteReport);

// Serve 'analytics.html' page
router.get('/analytics', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/analytics.html'));
});

// Chart data route
router.get('/chart-data', chartController.getChartData);

module.exports = router;
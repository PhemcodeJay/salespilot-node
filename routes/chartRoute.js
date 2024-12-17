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

// Routes for chart reports
router.post('/chart', chartController.createReport);  // Create a report
router.get('/chart/:chart_id', chartController.getReportById); // Get specific report by ID
router.get('/chart', chartController.getAllchart);  // Get all chart reports
router.put('/chart/:chart_id', chartController.updateReport);  // Update a report
router.delete('/chart/:chart_id', chartController.deleteReport);  // Delete a report

// Serve 'analytics.html' page
router.get('/analytics', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/analytics.html'));  // Serve the analytics page
});

// Route to fetch chart data based on selected time range
router.get('/chart-data', chartController.getChartData);  // Get chart data (from the getChartData function)

// You can also add other routes for authentication if necessary
// router.post('/auth/login', authController.login);
// router.post('/auth/register', authController.register);

// Export the router to be used in the main app
module.exports = router;

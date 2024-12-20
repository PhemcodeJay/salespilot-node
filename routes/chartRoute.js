const express = require('express');
const router = express.Router();
const path = require('path'); // For serving static files
const chartController = require('../controllers/chartcontroller'); // Correct import path

// Routes for chart reports
router.post('/chart', chartController.createReport);  // Create a report
router.get('/chart/:chart_id', chartController.getReportById); // Get specific report by ID
router.get('/chart', chartController.getAllReports);  // Get all chart reports (fixed)
router.put('/chart/:chart_id', chartController.updateReport);  // Update a report
router.delete('/chart/:chart_id', chartController.deleteReport);  // Delete a report

// Serve 'analytics.html' page
router.get('/analytics', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/analytics.html'));  // Serve the analytics page
});

// Route to fetch chart data based on selected time range
router.get('/chart-data', chartController.getChartData);  // Get chart data (from the getChartData function)

// Export the router to be used in the main app
module.exports = router;

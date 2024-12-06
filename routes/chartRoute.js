const express = require('express');
const router = express.Router();
const path = require('path'); // For serving static files
const chartController = require('../controllers/chartcontroller');
const authController = require('../controllers/authcontroller');

// Routes for Reports
router.post('/reports', reportsController.createReport);
router.get('/reports/:reports_id', reportsController.getReportById);
router.get('/reports', reportsController.getAllReports);
router.put('/reports/:reports_id', reportsController.updateReport);
router.delete('/reports/:reports_id', reportsController.deleteReport);

// Serve 'analytics.html' page
router.get('/analytics', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/analytics.html'));
});

// Chart data route
router.get('/chart-data', reportsController.getChartData);

module.exports = router;
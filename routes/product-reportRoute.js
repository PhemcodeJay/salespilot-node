const express = require('express');
const router = express.Router();
const path = require('path');
const session = require('express-session');
const verifyToken = require('../middleware/auth');
const reportController = require('../controllers/product-reportcontroller');

// Middleware for session handling
router.use(session({
  secret: 'your-secret-key', // Replace with your actual secret key
  resave: false,
  saveUninitialized: true,
}));

// Route to generate and fetch analytics report
router.get('/analytics', async (req, res) => {
  try {
    // Call the report generation logic
    await reportController.generateReport(req, res);
  } catch (error) {
    console.error('Error handling analytics route:', error);
    res.status(500).json({ error: 'Failed to generate analytics data.' });
  }
});

// Serve 'inventory-metrics.html' page
router.get('/inventory-metrics', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/inventory-metrics.html'));
});

module.exports = router;

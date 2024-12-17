const express = require('express');
const router = express.Router();
const path = require('path');
const { sessionMiddleware, generateReport } = require('../controllers/productcontroller'); // Import the controller
const verifyToken = require('../verifyToken'); // Import your token verification middleware

// Apply session middleware for the entire router
router.use(sessionMiddleware);

// Serve 'analytics.html' page (this is the page for analytics metrics)
router.get('/analytics', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/sales-metrics.html'));
});

// Route for generating the report
router.post('/generate-report', verifyToken, async (req, res) => {
    try {
        // Call the controller function to generate the report
        await generateReport(req, res);
    } catch (error) {
        console.error('Error in generating report:', error);
        return res.status(500).json({ error: 'Failed to generate report' });
    }
});

// Route for any other functionality you may need to implement (like file uploads, etc.)
// Example: router.post('/upload', multer().single('file'), (req, res) => {...});

module.exports = router;

const express = require('express');
const router = express.Router();
const path = require('path');
const { sessionMiddleware, generateReport, handleProductUpload } = require('../controllers/productcontroller'); // Import controller functions
const { checkLogin } = require('../middleware/auth'); // Import middleware



// Serve the 'analytics.html' page for product category analytics
router.get('/analytics', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/sales-metrics.html')); // Serve the analytics page
});

// Route for generating a report
router.post('/generate-report', checkLogin, async (req, res) => {
    try {
        await generateReport(req, res); // Call the controller function for generating the report
    } catch (error) {
        console.error('Error in generating report:', error);
        res.status(500).json({ error: 'Failed to generate report' }); // Handle errors
    }
});



module.exports = router; // Export the router to be used in other parts of the app

const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardcontroller');

// Define the route
router.get('/api/dashboard', async (req, res) => {
  try {
    // Call the controller method
    const dashboardData = await dashboardController.getDashboardData(req, res);
    
    // Send the response
    res.json(dashboardData);
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

module.exports = router;

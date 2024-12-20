const express = require('express');
const router = express.Router();
const { sessionMiddleware, generateAnalytics } = require('../controllers/analyticsController'); // Import the controller
const { checkLogin } = require('../middleware/auth'); // Import middleware

// Apply session middleware for the entire router
router.use(sessionMiddleware);

// Route to generate analytics insights
router.post('/generate-analytics', checkLogin, async (req, res) => {
  try {
    // Call the generateAnalytics function from the controller
    await generateAnalytics(req, res);
  } catch (error) {
    console.error('Error in generating analytics:', error);
    return res.status(500).json({ error: 'Failed to generate analytics' });
  }
});

// Export the router
module.exports = router;

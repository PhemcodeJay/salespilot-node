const express = require('express');
const path = require('path');
const router = express.Router();
const { sessionMiddleware } = require('../controllers/dashboardcontroller'); // Adjust path if needed

// Apply session middleware
router.use(sessionMiddleware);

// Serve dashboard.html as static from the public folder
router.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'dashboard.html'));
});

module.exports = router;

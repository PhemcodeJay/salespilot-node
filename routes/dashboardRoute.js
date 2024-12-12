const express = require('express');
const path = require('path');
const router = express.Router();
const notificationController = require('../controllers/notificationcontroller');
const authController = require('../controllers/authcontroller');
const productController = require('../controllers/productcontroller');
const salesController = require('../controllers/salescontroller');
const profileController = require('../controllers/profilecontroller');
const pool = require('../models/db'); // Import the database connection
const verifyToken = require('../verifyToken');


// Serve dashboard.html as static from the public folder
router.get('/api/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'dashboard.html'));
});

module.exports = router;

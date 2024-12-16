const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const productController = require('../controllers/productcontroller');
const authController = require('../controllers/authcontroller');
const pool = require('../models/db'); // Import the database connection
const session = require('express-session');
const verifyToken = require('../verifyToken');
const PDFDocument = require('pdfkit');


// Serve 'analytics.html' page
router.get('/analytics', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/inventory-metrics.html'));
});


module.exports = router;
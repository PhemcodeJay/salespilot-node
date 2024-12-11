const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const productController = require('../controllers/productcontroller');
const authController = require('../controllers/authcontroller');
const pool = require('../models/db'); // Import the database connection
const verifyToken = require('../verifyToken');
const PDFDocument = require('pdfkit');
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const productController = require('../controllers/productcontroller');
const pool = require('../models/db'); // Import the database connection
const PDFDocument = require('pdfkit');

// Middleware for file uploads
const upload = multer({
    dest: 'uploads/products/', // Directory to store uploaded files
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max file size
    fileFilter: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        if (['.jpg', '.jpeg', '.png', '.gif'].includes(ext)) {
            return cb(null, true);
        }
        cb(new Error('Invalid file type. Only images are allowed.'));
    }
});

// Helper function to sanitize user input
const sanitizeInput = (input) => input?.trim()?.replace(/[<>"]/g, '');

// Serve static files from the 'public' directory
router.use(express.static(path.join(__dirname, 'public')));

// List all products
router.get('/products', productController.listProducts);

// Display add or update product form
router.get('/product/add', productController.getProductForm);

// Add or update a product
router.post('/product/add', upload.single('pic'), async (req, res) => {
    try {
        const sanitizedData = {
            name: sanitizeInput(req.body.name),
            staff_name: sanitizeInput(req.body.staff_name),
            category_name: sanitizeInput(req.body.category_name),
            cost: parseFloat(req.body.cost || 0),
            price: parseFloat(req.body.price || 0),
            stock_qty: parseInt(req.body.stock_qty || 0),
            supply_qty: parseInt(req.body.supply_qty || 0),
            description: sanitizeInput(req.body.description),
            new_category: sanitizeInput(req.body.new_category),
        };

        // File upload handling
        let imagePath = null;
        if (req.file) {
            imagePath = path.join(req.file.destination, req.file.filename);
            ensureDirectoryExistence(imagePath);
        }

        // Delegate the operation to the controller
        await productController.addOrUpdateProduct(sanitizedData, imagePath);

        res.redirect('/api/products'); // Redirect to the list of products
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Server error." });
    }
});

// Helper function to ensure directory existence before saving the image
const ensureDirectoryExistence = (filePath) => {
    const dirname = path.dirname(filePath);
    if (fs.existsSync(dirname)) {
        return true;
    }
    fs.mkdirSync(dirname, { recursive: true });
};

module.exports = router;

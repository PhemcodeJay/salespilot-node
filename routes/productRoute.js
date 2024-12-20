const express = require('express');
const multer = require('multer');
const path = require('path');
const { listProducts, addOrUpdateProduct, deleteProduct } = require('../controllers/productcontroller');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadsDir = path.join(__dirname, '..', 'uploads');
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
        }
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        cb(null, `${uniqueSuffix}-${file.originalname}`);
    },
});

const upload = multer({ storage: storage });

// List products
router.get('/products', listProducts);

// Add or update a product
router.post('/product', upload.single('pic'), addOrUpdateProduct);

// Delete a product
router.delete('/product/:id', deleteProduct);

module.exports = router;

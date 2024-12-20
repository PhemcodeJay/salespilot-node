const express = require('express');
const { checkLogin } = require('../middleware/auth');
const supplierController = require('../controllers/suppliercontroller'); // Make sure this path is correct

const router = express.Router();

// Supplier CRUD routes
router.get('/suppliers/:supplier_id', checkLogin, supplierController.getSupplierById);
router.post('/suppliers', checkLogin, supplierController.addSupplier);
router.put('/suppliers/:supplier_id', checkLogin, supplierController.updateSupplier);
router.delete('/suppliers/:supplier_id', checkLogin, supplierController.deleteSupplier);

// PDF generation route
router.get('/suppliers/pdf/:supplier_id', checkLogin, supplierController.generateSupplierPDF);

module.exports = router;

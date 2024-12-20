const mysql = require('mysql2');
const FPDF = require('pdfkit');

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
});

// Fetch all suppliers
const getSuppliers = (req, res) => {
    pool.query('SELECT * FROM suppliers', (err, results) => {
        if (err) {
            return res.status(500).json({ message: 'Database error', error: err });
        }
        res.json(results);
    });
};

// Fetch a single supplier by ID
const getSupplierById = (req, res) => {
    const supplierId = req.params.supplier_id;
    pool.query('SELECT * FROM suppliers WHERE supplier_id = ?', [supplierId], (err, results) => {
        if (err) {
            return res.status(500).json({ message: 'Database error', error: err });
        }
        if (results.length === 0) {
            return res.status(404).json({ message: 'Supplier not found' });
        }
        res.json(results[0]);
    });
};

// Add a new supplier
const addSupplier = (req, res) => {
    const { supplier_name, product_name, supplier_email, supplier_phone, supplier_location, note, supply_qty } = req.body;

    if (!supplier_name || !product_name || !supply_qty) {
        return res.status(400).json({ message: 'Supplier name, product name, and supply quantity are required.' });
    }

    pool.query(`
        INSERT INTO suppliers (supplier_name, product_name, supplier_email, supplier_phone, supplier_location, note, supply_qty)
        VALUES (?, ?, ?, ?, ?, ?, ?)`, 
        [supplier_name, product_name, supplier_email, supplier_phone, supplier_location, note, supply_qty], 
        (err, result) => {
            if (err) return res.status(500).json({ message: 'Error inserting supplier', error: err });
            res.status(201).json({ message: 'Supplier added successfully', supplier_id: result.insertId });
        }
    );
};

// Update supplier details
const updateSupplier = (req, res) => {
    const supplierId = req.params.supplier_id;
    const { supplier_name, product_name, supplier_email, supplier_phone, supplier_location, note, supply_qty } = req.body;

    if (!supplier_name || !product_name || !supply_qty) {
        return res.status(400).json({ message: 'All fields are required.' });
    }

    pool.query(`
        UPDATE suppliers 
        SET supplier_name = ?, product_name = ?, supplier_email = ?, supplier_phone = ?, supplier_location = ?, note = ?, supply_qty = ?
        WHERE supplier_id = ?`, 
        [supplier_name, product_name, supplier_email, supplier_phone, supplier_location, note, supply_qty, supplierId], 
        (err, result) => {
            if (err) return res.status(500).json({ message: 'Error updating supplier', error: err });
            res.json({ message: 'Supplier updated successfully' });
        }
    );
};

// Delete a supplier
const deleteSupplier = (req, res) => {
    const supplierId = req.params.supplier_id;
    pool.query('DELETE FROM suppliers WHERE supplier_id = ?', [supplierId], (err, result) => {
        if (err) return res.status(500).json({ message: 'Error deleting supplier', error: err });
        res.json({ message: 'Supplier deleted successfully' });
    });
};

// Generate PDF for supplier details
const generateSupplierPDF = (req, res) => {
    const supplierId = req.params.supplier_id;

    pool.query('SELECT * FROM suppliers WHERE supplier_id = ?', [supplierId], (err, supplier) => {
        if (err) return res.status(500).json({ message: 'Error fetching supplier details', error: err });
        if (!supplier || supplier.length === 0) {
            return res.status(404).json({ message: 'Supplier not found' });
        }

        const supplierData = supplier[0];
        const pdf = new FPDF();
        pdf.addPage();
        pdf.setFont('Arial', 'B', 16);
        pdf.cell(40, 10, 'Supplier Details');
        pdf.ln();
        pdf.setFont('Arial', '', 12);
        pdf.cell(40, 10, `Name: ${supplierData.supplier_name}`);
        pdf.ln();
        pdf.cell(40, 10, `Email: ${supplierData.supplier_email}`);
        pdf.ln();
        pdf.cell(40, 10, `Phone: ${supplierData.supplier_phone}`);
        pdf.ln();
        pdf.cell(40, 10, `Location: ${supplierData.supplier_location}`);
        
        if (supplierData.note) {
            pdf.cell(40, 10, `Note: ${supplierData.note}`);
            pdf.ln();
        }

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=supplier_${supplierId}.pdf`);
        pdf.pipe(res);
        pdf.end();
    });
};

module.exports = {
    getSuppliers,
    getSupplierById,
    addSupplier,
    updateSupplier,
    deleteSupplier,
    generateSupplierPDF,
};

const express = require('express');
const mysql = require('mysql2');
const PDFDocument = require('pdfkit');
const router = express.Router();

// Database connection setup
const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'salespilot'
});

// Middleware to check if user is logged in
function checkSession(req, res, next) {
    if (!req.session.username) {
        return res.status(401).send('No username found in session.');
    }
    next();
}

// Handle POST form actions: Add or update staff, or delete staff
router.post('/', checkSession, (req, res) => {
    const { staff_name, staff_email, staff_phone, position, action, staff_id } = req.body;

    if (action === 'update' || action === 'insert') {
        const query = action === 'update' 
            ? "UPDATE staffs SET staff_name = ?, staff_email = ?, staff_phone = ?, position = ? WHERE staff_id = ?"
            : "INSERT INTO staffs (staff_name, staff_email, staff_phone, position) VALUES (?, ?, ?, ?)";

        const params = action === 'update' 
            ? [staff_name, staff_email, staff_phone, position, staff_id] 
            : [staff_name, staff_email, staff_phone, position];

        connection.execute(query, params, (err, result) => {
            if (err) return res.status(500).send(err.message);
            res.redirect('/page-list-staffs');
        });
    }

    // Handle delete action
    if (action === 'delete') {
        if (!staff_id) return res.status(400).send('Staff ID is required for deletion.');
        
        const deleteQuery = "DELETE FROM staffs WHERE staff_id = ?";
        connection.execute(deleteQuery, [staff_id], (err, result) => {
            if (err) return res.status(500).send(err.message);
            res.json({ success: 'Staff deleted' });
        });
    }
});

// Generate and download staff PDF
router.post('/generate-pdf', checkSession, (req, res) => {
    const { staff_id } = req.body;

    if (!staff_id) {
        return res.status(400).send('Staff ID is required for generating PDF.');
    }

    const query = "SELECT * FROM staffs WHERE staff_id = ?";
    connection.execute(query, [staff_id], (err, staff) => {
        if (err) return res.status(500).send(err.message);
        if (!staff.length) return res.status(404).send('Staff not found.');

        const doc = new PDFDocument();
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=staff_${staff_id}.pdf`);
        
        doc.pipe(res);
        doc.fontSize(16).text('Staff Details');
        doc.fontSize(12).text(`Staff Name: ${staff[0].staff_name}`);
        doc.text(`Staff Email: ${staff[0].staff_email}`);
        doc.text(`Staff Phone: ${staff[0].staff_phone}`);
        doc.text(`Position: ${staff[0].position}`);
        
        doc.end();
    });
});

module.exports = router;

const express = require('express');
const mysql = require('mysql2');
const PDFDocument = require('pdfkit');
const router = express.Router();
const path = require('path');

// MySQL connection setup using pool for better performance and management
const db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Middleware to check if the user is logged in
function checkSession(req, res, next) {
    if (!req.session.username) {
        return res.status(401).send('No username found in session.');
    }
    next();
}

// Serve static pages from 'public' directory
router.use(express.static(path.join(__dirname, 'public')));

// Handle POST form actions: Add or update staff, or delete staff
router.post('/staff', checkSession, (req, res) => {
    const { staff_name, staff_email, staff_phone, position, action, staff_id } = req.body;

    if (action === 'update' || action === 'insert') {
        const query = action === 'update' 
            ? "UPDATE staffs SET staff_name = ?, staff_email = ?, staff_phone = ?, position = ? WHERE staff_id = ?"
            : "INSERT INTO staffs (staff_name, staff_email, staff_phone, position) VALUES (?, ?, ?, ?)";

        const params = action === 'update' 
            ? [staff_name, staff_email, staff_phone, position, staff_id] 
            : [staff_name, staff_email, staff_phone, position];

        db.execute(query, params, (err, result) => {
            if (err) return res.status(500).send(err.message);
            res.redirect('/page-list-staffs');
        });
    }

    // Handle delete action
    if (action === 'delete') {
        if (!staff_id) return res.status(400).send('Staff ID is required for deletion.');

        const deleteQuery = "DELETE FROM staffs WHERE staff_id = ?";
        db.execute(deleteQuery, [staff_id], (err, result) => {
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
    db.execute(query, [staff_id], (err, staff) => {
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

// Route for the add staff page
router.get('/page-add-staffs', checkSession, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'page-add-staffs.html'));
});

// Route for the list staff page
router.get('/page-list-staffs', checkSession, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'page-list-staffs.html'));
});

module.exports = router;

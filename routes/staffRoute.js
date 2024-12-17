const express = require('express');
const mysql = require('mysql2');
const PDFDocument = require('pdfkit');
const path = require('path');
const authController = require('../controllers/authcontroller');
const staffController = require('../controllers/staffcontroller');
const pool = require('../models/db'); // Import the database connection
const session = require('express-session');
const verifyToken = require('../verifyToken');
const multer = require('multer');

const router = express.Router();

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

        pool.execute(query, params, (err, result) => {
            if (err) return res.status(500).send(err.message);
            res.redirect('/page-list-staffs');
        });
    }

    // Handle delete action
    if (action === 'delete') {
        if (!staff_id) return res.status(400).send('Staff ID is required for deletion.');

        const deleteQuery = "DELETE FROM staffs WHERE staff_id = ?";
        pool.execute(deleteQuery, [staff_id], (err, result) => {
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
    pool.execute(query, [staff_id], (err, staff) => {
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

// Generate PDF report of all staffs
router.post('/generate-staffs-pdf', checkSession, async (req, res) => {
    try {
        // Fetch all staffs
        const [staffs] = await pool.promise().query('SELECT * FROM staffs ORDER BY date DESC');

        if (staffs.length === 0) {
            return res.status(404).json({ message: 'No staffs found' });
        }

        // Create the reports directory if it doesn't exist
        const reportsDir = path.join(__dirname, '..', 'reports');
        if (!fs.existsSync(reportsDir)) {
            fs.mkdirSync(reportsDir);
        }

        // Create a new PDF document
        const doc = new PDFDocument();
        
        // Set the file name and path
        const filePath = path.join(reportsDir, `staffs_report_${Date.now()}.pdf`);

        // Pipe the document to a file
        doc.pipe(fs.createWriteStream(filePath));

        // Title and headers
        doc.fontSize(18).text('Staff Report', { align: 'center' });
        doc.moveDown();
        doc.fontSize(12).text(`Date Generated: ${new Date().toLocaleString()}`, { align: 'center' });
        doc.moveDown();
        
        doc.text('--------------------------------------', { align: 'center' });
        doc.moveDown();
        
        doc.text('ID | Name | Email | Phone | Position');
        doc.text('--------------------------------------');
        
        // Add staff data to the PDF
        staffs.forEach(staff => {
            doc.text(`${staff.staff_id} | ${staff.staff_name} | ${staff.staff_email} | ${staff.staff_phone} | ${staff.position}`);
        });

        // End and save the PDF document
        doc.end();

        // Send the response with the file path or download option
        res.status(200).json({ message: 'PDF report generated successfully', filePath: filePath });
    } catch (err) {
        return res.status(500).json({ message: 'Error generating PDF', error: err.message });
    }
});

module.exports = router;

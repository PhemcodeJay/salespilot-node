// Import required modules
const express = require('express');
const session = require('express-session');
const mysql = require('mysql2/promise');
const PDFDocument = require('pdfkit');
const bodyParser = require('body-parser');
const { sanitizeHtml } = require('sanitize-html');

// Initialize the app
const app = express();
const port = 3000;

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(
    session({
        secret: 'your_secret_key',
        resave: false,
        saveUninitialized: true,
        cookie: {
            maxAge: 86400000, // 1 day
            secure: true,
            httpOnly: true
        }
    })
);

// Database connection
const pool = mysql.createPool({
    host: 'your-host',
    user: 'your-username',
    password: 'your-password',
    database: 'your-database',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Sanitize input
function sanitizeInput(input) {
    return sanitizeHtml(input, {
        allowedTags: [],
        allowedAttributes: {}
    });
}

// Fetch data from a table
async function fetchData(table, idColumn, id) {
    if (!Number.isInteger(parseInt(id))) return false;
    try {
        const [rows] = await pool.query(`SELECT * FROM ?? WHERE ?? = ?`, [table, idColumn, id]);
        return rows[0] || null;
    } catch (err) {
        console.error(err);
        return null;
    }
}

// Generate PDF
function generatePDF(title, data, res) {
    const doc = new PDFDocument();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${title}.pdf"`);
    
    doc.pipe(res);

    doc.fontSize(16).text(title, { align: 'center' });
    doc.moveDown();

    Object.keys(data).forEach((key) => {
        doc.fontSize(12).text(`${key}: ${data[key]}`);
    });

    doc.end();
}

// Routes
app.get('/generate-pdf/:type/:id', async (req, res) => {
    const { type, id } = req.params;
    const sanitizedId = sanitizeInput(id);

    try {
        let data;
        switch (type) {
            case 'customer':
                data = await fetchData('customers', 'customer_id', sanitizedId);
                if (data) {
                    generatePDF('Customer Information', data, res);
                } else {
                    res.status(404).send('Customer not found.');
                }
                break;

            case 'product':
                data = await fetchData('products', 'id', sanitizedId);
                if (data) {
                    generatePDF('Product Information', data, res);
                } else {
                    res.status(404).send('Product not found.');
                }
                break;

            case 'invoice':
                const invoice = await fetchData('invoices', 'invoice_id', sanitizedId);
                if (invoice) {
                    const [items] = await pool.query('SELECT * FROM invoice_items WHERE invoice_id = ?', [sanitizedId]);
                    generatePDF('Invoice Details', { ...invoice, items }, res);
                } else {
                    res.status(404).send('Invoice not found.');
                }
                break;

            default:
                res.status(400).send('Invalid type.');
        }
    } catch (err) {
        console.error(err);
        res.status(500).send('An error occurred while generating the PDF.');
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});

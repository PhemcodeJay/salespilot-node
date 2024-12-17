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

// Middleware for parsing request bodies
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Middleware for session management
app.use(
    session({
        secret: 'your_secret_key',
        resave: false,
        saveUninitialized: true,
        cookie: {
            maxAge: 86400000, // 1 day
            secure: true,
            httpOnly: true,
        },
    })
);

// Database connection pool
const pool = mysql.createPool({
    host: 'your-host',
    user: 'your-username',
    password: 'your-password',
    database: 'your-database',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
});

// Sanitize input data
function sanitizeInput(input) {
    return sanitizeHtml(input, {
        allowedTags: [],
        allowedAttributes: {},
    });
}

// Fetch data from a table by id
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

// Middleware to generate PDF
function generatePDFMiddleware(title, table, idColumn) {
    return async (req, res, next) => {
        const { id } = req.params;
        const sanitizedId = sanitizeInput(id);

        try {
            const data = await fetchData(table, idColumn, sanitizedId);
            if (data) {
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
            } else {
                res.status(404).send(`${title} not found.`);
            }
        } catch (err) {
            console.error(err);
            res.status(500).send('An error occurred while generating the PDF.');
        }
    };
}

// Routes using middleware
app.get('/generate-pdf/customer/:id', generatePDFMiddleware('Customer Information', 'customers', 'customer_id'));
app.get('/generate-pdf/product/:id', generatePDFMiddleware('Product Information', 'products', 'id'));
app.get('/generate-pdf/invoice/:id', generatePDFMiddleware('Invoice Details', 'invoices', 'invoice_id'));

// Start the server
app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});

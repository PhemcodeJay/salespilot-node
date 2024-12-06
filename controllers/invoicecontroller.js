const mysql = require('mysql2');
const fs = require('fs');
const pdfkit = require('pdfkit');
const path = require('path');
const jwt = require('jsonwebtoken');

// MySQL connection pool setup
const pool = mysql.createPool({
    host: 'localhost',
    user: 'root', // Replace with actual DB username
    password: '', // Replace with actual DB password
    database: 'dbs13455438',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// JWT token verification function
const verifyToken = (token) => {
    try {
        return jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
        return null;
    }
};

// Fetch user details by token
const fetchUserInfo = (username) => {
    return new Promise((resolve, reject) => {
        pool.query('SELECT username, email, date, phone, location, user_image FROM users WHERE username = ?', [username], (err, results) => {
            if (err) return reject("Error fetching user info");
            if (results.length === 0) return reject("User not found.");
            resolve(results[0]);
        });
    });
};

// Generate PDF report of all invoices
const generateInvoicesPdf = async (req, res) => {
    try {
        // Fetch all invoices
        const [invoices] = await pool.promise().query('SELECT * FROM invoices ORDER BY date DESC');

        if (invoices.length === 0) {
            return res.status(404).json({ message: 'No invoices found' });
        }

        // Create the reports directory if it doesn't exist
        const reportsDir = path.join(__dirname, '..', 'reports');
        if (!fs.existsSync(reportsDir)) {
            fs.mkdirSync(reportsDir);
        }

        // Create a new PDF document
        const doc = new pdfkit();
        
        // Set the file name and path
        const filePath = path.join(reportsDir, `invoices_report_${Date.now()}.pdf`);

        // Pipe the document to a file
        doc.pipe(fs.createWriteStream(filePath));

        // Title and headers
        doc.fontSize(18).text('Invoice Report', { align: 'center' });
        doc.moveDown();
        doc.fontSize(12).text(`Date Generated: ${new Date().toLocaleString()}`, { align: 'center' });
        doc.moveDown();
        
        doc.text('--------------------------------------', { align: 'center' });
        doc.moveDown();
        
        doc.text('ID | Description | Amount | Date | Category');
        doc.text('--------------------------------------');
        
        // Add invoices data to the PDF
        invoices.forEach(invoice => {
            doc.text(`${invoice.id} | ${invoice.description} | $${invoice.amount} | ${invoice.date} | ${invoice.category}`);
        });

        // End and save the PDF document
        doc.end();

        // Send the response with the file path or download option
        res.status(200).json({ message: 'PDF report generated successfully', filePath: filePath });
    } catch (err) {
        return res.status(500).json({ message: 'Error generating PDF', error: err.message });
    }
};

// Create Invoice
const createInvoice = (invoiceData, itemsData, callback) => {
    const { invoice_number, customer_name, invoice_description, order_date, order_status, order_id, delivery_address, mode_of_payment, due_date, subtotal, discount, total_amount } = invoiceData;

    const query = `
        INSERT INTO invoices (invoice_number, customer_name, invoice_description, order_date, order_status, order_id, delivery_address, mode_of_payment, due_date, subtotal, discount, total_amount)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    pool.query(query, [invoice_number, customer_name, invoice_description, order_date, order_status, order_id, delivery_address, mode_of_payment, due_date, subtotal, discount, total_amount], (err, result) => {
        if (err) return callback(err);

        const invoiceId = result.insertId;
        const itemQuery = `
            INSERT INTO invoice_items (invoice_id, item_name, qty, price, total)
            VALUES ?`;
        const items = itemsData.map(item => [
            invoiceId, item.item_name, item.qty, item.price, item.qty * item.price
        ]);

        pool.query(itemQuery, [items], (err) => {
            if (err) return callback(err);
            callback(null, invoiceId);  // Invoice and items created successfully
        });
    });
};

// Read Invoice
const getInvoice = (invoiceId, callback) => {
    const query = 'SELECT * FROM invoices WHERE invoice_id = ?';
    pool.query(query, [invoiceId], (err, invoiceData) => {
        if (err) return callback(err);
        if (invoiceData.length === 0) return callback(new Error("Invoice not found"));

        const invoice = invoiceData[0];
        const itemsQuery = 'SELECT * FROM invoice_items WHERE invoice_id = ?';
        pool.query(itemsQuery, [invoiceId], (err, itemsData) => {
            if (err) return callback(err);
            callback(null, { invoice, items: itemsData });
        });
    });
};

// Update Invoice
const updateInvoice = (invoiceId, invoiceData, callback) => {
    const { invoice_number, customer_name, invoice_description, order_date, order_status, order_id, delivery_address, mode_of_payment, due_date, subtotal, discount, total_amount } = invoiceData;
    
    const query = `
        UPDATE invoices SET invoice_number = ?, customer_name = ?, invoice_description = ?, order_date = ?, order_status = ?, order_id = ?, delivery_address = ?, mode_of_payment = ?, due_date = ?, subtotal = ?, discount = ?, total_amount = ?
        WHERE invoice_id = ?`;

    pool.query(query, [invoice_number, customer_name, invoice_description, order_date, order_status, order_id, delivery_address, mode_of_payment, due_date, subtotal, discount, total_amount, invoiceId], (err, result) => {
        if (err) return callback(err);
        callback(null, result);  // Invoice updated successfully
    });
};

// Delete Invoice
const deleteInvoice = (invoiceId, callback) => {
    const deleteItemsQuery = 'DELETE FROM invoice_items WHERE invoice_id = ?';
    pool.query(deleteItemsQuery, [invoiceId], (err) => {
        if (err) return callback(err);

        const deleteInvoiceQuery = 'DELETE FROM invoices WHERE invoice_id = ?';
        pool.query(deleteInvoiceQuery, [invoiceId], (err) => {
            if (err) return callback(err);
            callback(null);  // Invoice and items deleted successfully
        });
    });
};

// PDF Generation Logic
const generateInvoicePDF = (invoiceId, callback) => {
    // Fetch invoice data and items
    getInvoice(invoiceId, (err, data) => {
        if (err) return callback(err);

        const { invoice, items } = data;
        const doc = new pdfkit();
        const filePath = `./invoices/${invoice.invoice_number}.pdf`;
        
        // Write to file
        doc.pipe(fs.createWriteStream(filePath));

        // Add invoice details
        doc.fontSize(20).text(`Invoice #${invoice.invoice_number}`, 100, 100);
        doc.fontSize(12).text(`Customer: ${invoice.customer_name}`, 100, 130);
        doc.text(`Date: ${invoice.order_date}`, 100, 150);
        doc.text(`Total: ${invoice.total_amount}`, 100, 170);

        // Add items
        doc.text('Items:', 100, 190);
        items.forEach((item, index) => {
            doc.text(`${item.item_name} - ${item.qty} x ${item.price} = ${item.total}`, 100, 210 + index * 20);
        });

        doc.end();

        // Return the file path for downloading
        callback(null, filePath);
    });
};

module.exports = {
    generateInvoicesPdf,
    createInvoice,
    getInvoice,
    updateInvoice,
    deleteInvoice,
    generateInvoicePDF
};

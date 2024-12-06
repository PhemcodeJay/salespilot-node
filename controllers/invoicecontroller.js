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
// MySQL connection setup
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
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

const mysql = require('mysql2');
const fs = require('fs');
const pdfkit = require('pdfkit');

// MySQL connection setup
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
});

db.connect((err) => {
    if (err) {
        console.error("Database connection failed: " + err.stack);
        return;
    }
    console.log("Connected to the database.");
});

// Create Invoice
const createInvoice = (invoiceData, itemsData, callback) => {
    const { invoice_number, customer_name, invoice_description, order_date, order_status, order_id, delivery_address, mode_of_payment, due_date, subtotal, discount, total_amount } = invoiceData;
    const query = `
        INSERT INTO invoices (invoice_number, customer_name, invoice_description, order_date, order_status, order_id, delivery_address, mode_of_payment, due_date, subtotal, discount, total_amount)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    db.query(query, [invoice_number, customer_name, invoice_description, order_date, order_status, order_id, delivery_address, mode_of_payment, due_date, subtotal, discount, total_amount], (err, result) => {
        if (err) return callback(err);

        const invoiceId = result.insertId;
        const itemQuery = `
            INSERT INTO invoice_items (invoice_id, item_name, qty, price, total)
            VALUES ?`;
        const items = itemsData.map(item => [
            invoiceId, item.item_name, item.qty, item.price, item.qty * item.price
        ]);
        db.query(itemQuery, [items], (err) => {
            if (err) return callback(err);
            callback(null, invoiceId);  // Invoice and items created successfully
        });
    });
};

// Read Invoice
const getInvoice = (invoiceId, callback) => {
    const query = 'SELECT * FROM invoices WHERE invoice_id = ?';
    db.query(query, [invoiceId], (err, invoiceData) => {
        if (err) return callback(err);
        if (invoiceData.length === 0) return callback(new Error("Invoice not found"));

        const invoice = invoiceData[0];
        const itemsQuery = 'SELECT * FROM invoice_items WHERE invoice_id = ?';
        db.query(itemsQuery, [invoiceId], (err, itemsData) => {
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
    db.query(query, [invoice_number, customer_name, invoice_description, order_date, order_status, order_id, delivery_address, mode_of_payment, due_date, subtotal, discount, total_amount, invoiceId], (err, result) => {
        if (err) return callback(err);
        callback(null, result);  // Invoice updated successfully
    });
};

// Delete Invoice
const deleteInvoice = (invoiceId, callback) => {
    const deleteItemsQuery = 'DELETE FROM invoice_items WHERE invoice_id = ?';
    db.query(deleteItemsQuery, [invoiceId], (err) => {
        if (err) return callback(err);

        const deleteInvoiceQuery = 'DELETE FROM invoices WHERE invoice_id = ?';
        db.query(deleteInvoiceQuery, [invoiceId], (err) => {
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
    createInvoice,
    getInvoice,
    updateInvoice,
    deleteInvoice,
    generateInvoicePDF
};

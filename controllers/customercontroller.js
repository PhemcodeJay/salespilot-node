const mysql = require('mysql2');
const jwt = require('jsonwebtoken');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const customerModel = require('../models/customer');
const userModel = require('../models/authModel');

// MySQL connection pool setup
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',  // Replace with actual DB username
    password: process.env.DB_PASS || '',  // Replace with actual DB password
    database: process.env.DB_NAME || 'dbs13455438',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Promise-based pool query
const query = (sql, params) => {
    return new Promise((resolve, reject) => {
        pool.query(sql, params, (err, results) => {
            if (err) reject(err);
            resolve(results);
        });
    });
};

// JWT token verification function
const verifyToken = (token) => {
    try {
        return jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
        return null;
    }
};

// Fetch user details by token
const fetchUserInfo = async (username) => {
    const results = await query('SELECT username, email, date, phone, location, user_image FROM users WHERE username = ?', [username]);
    if (results.length === 0) throw new Error("User not found.");
    return results[0];
};

// Fetch all customers
const fetchAllCustomers = async () => {
    const results = await query('SELECT customer_id, customer_name, customer_email, customer_phone, customer_location FROM customers');
    return results;
};

// Add a new customer
const addCustomer = async (customer_name, customer_email, customer_phone, customer_location) => {
    const result = await query('INSERT INTO customers (customer_name, customer_email, customer_phone, customer_location) VALUES (?, ?, ?, ?)', 
        [customer_name, customer_email, customer_phone, customer_location]);
    return { id: result.insertId };
};

// Update an existing customer
const updateCustomer = async (customer_id, customer_name, customer_email, customer_phone, customer_location) => {
    await query('UPDATE customers SET customer_name = ?, customer_email = ?, customer_phone = ?, customer_location = ? WHERE customer_id = ?',
        [customer_name, customer_email, customer_phone, customer_location, customer_id]);
    return { message: "Customer updated successfully" };
};

// Delete a customer
const deleteCustomer = async (customer_id) => {
    await query('DELETE FROM customers WHERE customer_id = ?', [customer_id]);
    return { message: "Customer deleted successfully" };
};

// Export customer details as PDF
const exportCustomerToPDF = async (customer_id) => {
    const results = await query('SELECT * FROM customers WHERE customer_id = ?', [customer_id]);
    if (results.length === 0) throw new Error("Customer not found");

    const customer = results[0];
    const doc = new PDFDocument();
    doc.fontSize(12).text(`Customer Details`, 100, 100);
    doc.text(`Name: ${customer.customer_name}`);
    doc.text(`Email: ${customer.customer_email}`);
    doc.text(`Phone: ${customer.customer_phone}`);
    doc.text(`Location: ${customer.customer_location}`);
    doc.end();

    return doc;
};

// Generate PDF report of all customers
const generateCustomersPdf = async (req, res) => {
    try {
        // Fetch all customers
        const customers = await query('SELECT customer_id, customer_name, customer_email, customer_phone, customer_location FROM customers ORDER BY customer_name DESC');

        if (customers.length === 0) {
            return res.status(404).json({ message: 'No customers found' });
        }

        // Create a new PDF document
        const doc = new PDFDocument();
        
        // Set the file name and path
        const filePath = path.join(__dirname, '..', 'reports', `customers_report_${Date.now()}.pdf`);

        // Pipe the document to a file
        doc.pipe(fs.createWriteStream(filePath));

        // Title and headers
        doc.fontSize(18).text('Customer Report', { align: 'center' });
        doc.moveDown();
        doc.fontSize(12).text(`Date Generated: ${new Date().toLocaleString()}`, { align: 'center' });
        doc.moveDown();
        
        doc.text('--------------------------------------', { align: 'center' });
        doc.moveDown();
        
        doc.text('Customer ID | Name | Email | Phone | Location');
        doc.text('--------------------------------------');
        
        // Add customers data to the PDF
        customers.forEach(customer => {
            doc.text(`${customer.customer_id} | ${customer.customer_name} | ${customer.customer_email} | ${customer.customer_phone} | ${customer.customer_location}`);
        });

        // End and save the PDF document
        doc.end();

        // Send the response with the file path or download option
        res.status(200).json({ message: 'PDF report generated successfully', filePath: filePath });
    } catch (err) {
        return res.status(500).json({ message: 'Error generating PDF', error: err.message });
    }
};

// Customer Controller (CRUD operations)
exports.customerController = async (req, res) => {
    try {
        const token = req.cookies['auth_token'];
        if (!token) {
            return res.status(403).json({ message: 'Authentication token is missing' });
        }

        const decoded = verifyToken(token);
        if (!decoded) {
            return res.status(403).json({ message: 'Invalid or expired token' });
        }

        const username = decoded.username;
        const user = await fetchUserInfo(username);
        const formattedDate = new Date(user.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        const imageToDisplay = user.user_image || 'uploads/user/default.png';
        const customers = await fetchAllCustomers();

        res.render('customerDashboard', {
            user: { username, email: user.email, date: formattedDate, location: user.location, imageToDisplay },
            customers
        });
    } catch (err) {
        console.error("Error: ", err);
        res.status(500).json({ message: err.message });
    }
};

// Handle customer actions (CRUD operations)
exports.handleCustomerActions = async (req, res) => {
    try {
        const { action, customer_id, customer_name, customer_email, customer_phone, customer_location } = req.body;

        // Add new customer
        if (action === 'add') {
            const customer = await addCustomer(customer_name, customer_email, customer_phone, customer_location);
            res.redirect('/customers');
        }

        // Update existing customer
        if (action === 'update') {
            await updateCustomer(customer_id, customer_name, customer_email, customer_phone, customer_location);
            res.redirect('/customers');
        }

        // Delete customer
        if (action === 'delete') {
            await deleteCustomer(customer_id);
            res.redirect('/customers');
        }

        // Export customer details as PDF
        if (action === 'save_pdf') {
            const doc = await exportCustomerToPDF(customer_id);
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename=customer_${customer_id}.pdf`);
            doc.pipe(res);
        }

        // Generate customers PDF report
        if (action === 'generate_customers_pdf') {
            await generateCustomersPdf(req, res);
        }
    } catch (err) {
        console.error("Error: ", err);
        res.status(500).json({ message: err.message });
    }
};

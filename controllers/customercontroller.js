const mysql = require('mysql2');
const jwt = require('jsonwebtoken');
const PDFDocument = require('pdfkit');
// MySQL connection setup
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
});
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

// Fetch all customers
const fetchAllCustomers = () => {
    return new Promise((resolve, reject) => {
        pool.query('SELECT customer_id, customer_name, customer_email, customer_phone, customer_location FROM customers', (err, results) => {
            if (err) return reject("Error fetching customers");
            resolve(results);
        });
    });
};

// Add a new customer
const addCustomer = (customer_name, customer_email, customer_phone, customer_location) => {
    return new Promise((resolve, reject) => {
        pool.query('INSERT INTO customers (customer_name, customer_email, customer_phone, customer_location) VALUES (?, ?, ?, ?)', 
        [customer_name, customer_email, customer_phone, customer_location], (err, results) => {
            if (err) return reject("Error adding customer");
            resolve({ id: results.insertId });
        });
    });
};

// Update an existing customer
const updateCustomer = (customer_id, customer_name, customer_email, customer_phone, customer_location) => {
    return new Promise((resolve, reject) => {
        pool.query('UPDATE customers SET customer_name = ?, customer_email = ?, customer_phone = ?, customer_location = ? WHERE customer_id = ?',
        [customer_name, customer_email, customer_phone, customer_location, customer_id], (err) => {
            if (err) return reject("Error updating customer");
            resolve({ message: "Customer updated successfully" });
        });
    });
};

// Delete a customer
const deleteCustomer = (customer_id) => {
    return new Promise((resolve, reject) => {
        pool.query('DELETE FROM customers WHERE customer_id = ?', [customer_id], (err) => {
            if (err) return reject("Error deleting customer");
            resolve({ message: "Customer deleted successfully" });
        });
    });
};

// Export customer details as PDF
const exportCustomerToPDF = (customer_id) => {
    return new Promise((resolve, reject) => {
        pool.query('SELECT * FROM customers WHERE customer_id = ?', [customer_id], (err, results) => {
            if (err) return reject("Error fetching customer for PDF");
            if (results.length === 0) return reject("Customer not found");

            const customer = results[0];
            const doc = new PDFDocument();
            doc.fontSize(12).text(`Customer Details`, 100, 100);
            doc.text(`Name: ${customer.customer_name}`);
            doc.text(`Email: ${customer.customer_email}`);
            doc.text(`Phone: ${customer.customer_phone}`);
            doc.text(`Location: ${customer.customer_location}`);
            doc.end();

            resolve(doc);
        });
    });
};

// Customer Controller (CRUD operations)
exports.customerController = async (req, res) => {
    try {
        const token = req.cookies['auth_token'];
        if (!token) {
            return res.status(403).json({ message: 'No token provided' });
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
    } catch (err) {
        console.error("Error: ", err);
        res.status(500).json({ message: err.message });
    }
};
const mysql = require('mysql2');
const jwt = require('jsonwebtoken');
const PDFDocument = require('pdfkit');

// Create a MySQL connection pool
const pool = mysql.createPool({
    host: 'localhost',
    user: 'your-db-username', // Replace with actual DB username
    password: 'your-db-password', // Replace with actual DB password
    database: 'salespilot',
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

exports.supplierController = async (req, res) => {
    try {
        // Check if the user is authenticated
        const token = req.cookies['auth_token']; // Assuming you're using cookies to store JWT
        if (!token) {
            return res.status(403).json({ message: 'No token provided' });
        }
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const username = decoded.username;

        // Fetch user info
        pool.query('SELECT username, email, date, phone, location, user_image FROM users WHERE username = ?', [username], (err, results) => {
            if (err) {
                console.error("Error fetching user info: ", err);
                return res.status(500).json({ message: 'Error fetching user info' });
            }

            if (results.length === 0) {
                return res.status(404).json({ message: 'User not found.' });
            }

            const { email, date, location, user_image } = results[0];
            const formattedDate = new Date(date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

            const imageToDisplay = user_image || 'uploads/user/default.png';

            // Fetch inventory notifications
            pool.query('SELECT * FROM inventory WHERE available_stock < ? OR available_stock > ?', [10, 1000], (err, inventoryNotifications) => {
                if (err) {
                    console.error("Error fetching inventory notifications: ", err);
                    return res.status(500).json({ message: 'Error fetching inventory notifications' });
                }

                // Fetch reports notifications
                pool.query('SELECT * FROM reports WHERE revenue_by_product > ? OR revenue_by_product < ?', [10000, 1000], (err, reportsNotifications) => {
                    if (err) {
                        console.error("Error fetching reports notifications: ", err);
                        return res.status(500).json({ message: 'Error fetching reports notifications' });
                    }

                    // Fetch all customers
                    pool.query('SELECT customer_id, customer_name, customer_email, customer_phone, customer_location FROM customers', (err, customers) => {
                        if (err) {
                            console.error("Error fetching customers: ", err);
                            return res.status(500).json({ message: 'Error fetching customers' });
                        }

                        // Render the view or return JSON
                        res.render('supplierDashboard', {
                            user: { username, email, date: formattedDate, location, imageToDisplay },
                            inventoryNotifications,
                            reportsNotifications,
                            customers
                        });
                    });
                });
            });
        });
    } catch (err) {
        console.error("Error: ", err);
        res.status(500).json({ message: err.message });
    }
};

// Handling customer actions (CRUD operations)
exports.handleCustomerActions = async (req, res) => {
    try {
        const { action, customer_id, customer_name, customer_email, customer_phone, customer_location } = req.body;

        if (action === 'delete') {
            pool.query('DELETE FROM customers WHERE customer_id = ?', [customer_id], (err, result) => {
                if (err) {
                    console.error("Error deleting customer: ", err);
                    return res.status(500).json({ message: 'Error deleting customer' });
                }
                return res.redirect('/customers');
            });
        }

        if (action === 'save_pdf') {
            // Generate PDF for customer
            pool.query('SELECT * FROM customers WHERE customer_id = ?', [customer_id], (err, results) => {
                if (err) {
                    console.error("Error fetching customer: ", err);
                    return res.status(500).json({ message: 'Error fetching customer' });
                }

                if (results.length === 0) {
                    return res.status(404).json({ message: 'Customer not found.' });
                }

                const customer = results[0];
                const doc = new PDFDocument();
                doc.fontSize(12).text(`Customer Details`, 100, 100);
                doc.text(`Name: ${customer.customer_name}`);
                doc.text(`Email: ${customer.customer_email}`);
                doc.text(`Phone: ${customer.customer_phone}`);
                doc.text(`Location: ${customer.customer_location}`);
                doc.end();
                res.setHeader('Content-Type', 'application/pdf');
                res.setHeader('Content-Disposition', `attachment; filename=customer_${customer_id}.pdf`);
                doc.pipe(res);
                return;
            });
        }

        if (action === 'update') {
            pool.query('INSERT INTO customers (customer_id, customer_name, customer_email, customer_phone, customer_location) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE customer_name = ?, customer_email = ?, customer_phone = ?, customer_location = ?',
                [customer_id, customer_name, customer_email, customer_phone, customer_location, customer_name, customer_email, customer_phone, customer_location], (err, result) => {
                    if (err) {
                        console.error("Error updating customer: ", err);
                        return res.status(500).json({ message: 'Error updating customer' });
                    }
                    return res.redirect('/customers');
                });
        }

    } catch (err) {
        console.error("Error: ", err);
        res.status(500).json({ message: err.message });
    }
};

const express = require('express');
const router = express.Router();
const mysql = require('mysql2');

// MySQL connection setup
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
});
// Route to display invoice page (GET)
router.get('/invoices', (req, res) => {
    // Ensure the user is logged in
    if (req.session.loggedin) {
        const username = req.session.username;

        // Query to get user information
        connection.query(
            'SELECT id, username, date, email, phone, location, is_active, role, user_image FROM users WHERE username = ?',
            [username],
            (err, userInfo) => {
                if (err) {
                    return res.status(500).send("Database error: " + err.message);
                }

                if (userInfo.length > 0) {
                    const user = userInfo[0];
                    const greeting = generateGreeting(user.username);

                    // Query to fetch invoices
                    connection.query(
                        'SELECT invoice_id, invoice_number, customer_name, order_date, mode_of_payment, order_status, total_amount FROM invoices',
                        (err, invoices) => {
                            if (err) {
                                return res.status(500).send("Error fetching invoices: " + err.message);
                            }

                            // Render the page with user info and invoices
                            res.render('invoices', {
                                user,
                                greeting,
                                invoices
                            });
                        }
                    );
                } else {
                    res.status(404).send("User not found.");
                }
            }
        );
    } else {
        res.redirect('/login');
    }
});

// Route to handle invoice creation (POST)
router.post('/invoices', (req, res) => {
    if (req.session.loggedin) {
        const { 
            invoice_number, customer_name, invoice_description, order_date, 
            order_status, order_id, delivery_address, mode_of_payment, 
            due_date, subtotal, discount, total_amount, item_name, 
            quantity, price 
        } = req.body;

        if (!item_name || !quantity || !price) {
            return res.status(400).send("No items were added to the invoice.");
        }

        // Start a transaction
        connection.beginTransaction((err) => {
            if (err) {
                return res.status(500).send("Transaction error: " + err.message);
            }

            // Insert the main invoice data
            const invoiceQuery = `
                INSERT INTO invoices (invoice_number, customer_name, invoice_description, order_date, order_status, 
                                      order_id, delivery_address, mode_of_payment, due_date, subtotal, discount, total_amount)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
            connection.query(invoiceQuery, [invoice_number, customer_name, invoice_description, order_date, order_status,
                order_id, delivery_address, mode_of_payment, due_date, subtotal, discount, total_amount], 
                (err, result) => {
                    if (err) {
                        return connection.rollback(() => {
                            res.status(500).send("Error inserting invoice data: " + err.message);
                        });
                    }

                    const invoiceId = result.insertId;

                    // Insert each item linked to the invoice
                    const itemQuery = `
                        INSERT INTO invoice_items (invoice_id, item_name, qty, price, total)
                        VALUES ?`;  // Note: Using VALUES ? for multiple records
                    const items = item_name.map((item, index) => {
                        const qty = quantity[index];
                        const pricePerItem = price[index];
                        const total = qty * pricePerItem;
                        return [invoiceId, item, qty, pricePerItem, total];
                    });

                    // Execute the batch insert
                    connection.query(itemQuery, [items], (err) => {
                        if (err) {
                            return connection.rollback(() => {
                                res.status(500).send("Error inserting invoice items: " + err.message);
                            });
                        }

                        // Commit the transaction
                        connection.commit((err) => {
                            if (err) {
                                return connection.rollback(() => {
                                    res.status(500).send("Error committing transaction: " + err.message);
                                });
                            }

                            res.redirect('/invoices');
                        });
                    });
                });
        });
    } else {
        res.redirect('/login');
    }
});

// Function to generate a personalized greeting
function generateGreeting(username) {
    const currentHour = new Date().getHours();
    const timeOfDay = currentHour < 12 ? "Morning" : currentHour < 18 ? "Afternoon" : "Evening";
    return `Hi ${username}, Good ${timeOfDay}`;
}

module.exports = router;

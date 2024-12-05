const { Op } = require('sequelize');
const { Inventory, Product, Report, User, Customer } = require('../models'); // Assuming Sequelize models are set up
const jwt = require('jsonwebtoken');
const PDFDocument = require('pdfkit');

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
        const user = await User.findOne({
            where: { username },
            attributes: ['username', 'email', 'date', 'phone', 'location', 'user_image']
        });

        if (!user) {
            throw new Error("User not found.");
        }

        const { email, date, location, user_image } = user;
        const formattedDate = new Date(date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

        const imageToDisplay = user_image || 'uploads/user/default.png';

        // Fetch inventory notifications
        const inventoryNotifications = await Inventory.findAll({
            where: {
                available_stock: {
                    [Op.lt]: 10,
                    [Op.gt]: 1000
                }
            },
            include: {
                model: Product,
                attributes: ['image_path']
            }
        });

        // Fetch reports notifications
        const reportsNotifications = await Report.findAll({
            where: {
                revenue_by_product: {
                    [Op.or]: [
                        { [Op.gt]: 10000 },
                        { [Op.lt]: 1000 }
                    ]
                }
            },
            include: {
                model: Product,
                attributes: ['image_path']
            }
        });

        // Fetch all customers
        const customers = await Customer.findAll({
            attributes: ['customer_id', 'customer_name', 'customer_email', 'customer_phone', 'customer_location']
        });

        // Rendering view or returning JSON
        res.render('supplierDashboard', {
            user: { username, email, date: formattedDate, location, imageToDisplay },
            inventoryNotifications,
            reportsNotifications,
            customers
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
            await Customer.destroy({
                where: { customer_id }
            });
            return res.redirect('/customers');
        }

        if (action === 'save_pdf') {
            // Generate PDF for customer
            const customer = await Customer.findByPk(customer_id);
            if (!customer) {
                return res.status(404).json({ message: 'Customer not found.' });
            }

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
        }

        if (action === 'update') {
            await Customer.upsert({
                customer_id,
                customer_name,
                customer_email,
                customer_phone,
                customer_location
            });
            return res.redirect('/customers');
        }

    } catch (err) {
        console.error("Error: ", err);
        res.status(500).json({ message: err.message });
    }
};

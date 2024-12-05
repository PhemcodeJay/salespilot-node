const express = require('express');
const session = require('express-session');
const { Sequelize, DataTypes } = require('sequelize');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// Initialize Express and database connection
const app = express();
const sequelize = new Sequelize('salespilot', 'root', '', {
    host: 'localhost',
    dialect: 'mysql',
});

// MySQL connection setup
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
});

// Models
const Users = sequelize.define('Users', {
    username: { type: DataTypes.STRING, allowNull: false },
    email: { type: DataTypes.STRING },
    date: { type: DataTypes.DATE },
});
const Sales = sequelize.define('Sales', {
    productId: { type: DataTypes.INTEGER },
    name: { type: DataTypes.STRING },
    totalPrice: { type: DataTypes.FLOAT },
    salesPrice: { type: DataTypes.FLOAT },
    salesQty: { type: DataTypes.INTEGER },
    saleStatus: { type: DataTypes.STRING },
    paymentStatus: { type: DataTypes.STRING },
    saleDate: { type: DataTypes.DATE, defaultValue: Sequelize.NOW }, // Add saleDate field
});
const Products = sequelize.define('Products', {
    name: { type: DataTypes.STRING },
    imagePath: { type: DataTypes.STRING },
});
const Inventory = sequelize.define('Inventory', {
    productId: { type: DataTypes.INTEGER },
    productName: { type: DataTypes.STRING },
    availableStock: { type: DataTypes.INTEGER },
    inventoryQty: { type: DataTypes.INTEGER },
    salesQty: { type: DataTypes.INTEGER },
});

// Define Staff and Customers models (assuming the missing models)
const Staffs = sequelize.define('Staffs', {
    staffName: { type: DataTypes.STRING },
});
const Customers = sequelize.define('Customers', {
    customerName: { type: DataTypes.STRING },
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: true,
    cookie: {
        maxAge: 86400 * 1000,
        secure: true,
        httpOnly: true,
    },
}));

// Session Validation Middleware
function validateSession(req, res, next) {
    if (!req.session.username) {
        return res.status(401).json({ error: 'User not logged in.' });
    }
    next();
}

// Routes
app.get('/user', validateSession, async (req, res) => {
    try {
        const user = await Users.findOne({ where: { username: req.session.username } });
        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }
        res.json({
            username: user.username,
            email: user.email,
            date: user.date,
        });
    } catch (err) {
        res.status(500).json({ error: 'Database error.', details: err.message });
    }
});

app.post('/sales', validateSession, async (req, res) => {
    const {
        name, saleStatus, salesPrice, totalPrice, salesQty,
        paymentStatus, saleNote, staffName, customerName,
    } = req.body;

    if (!name || !saleStatus || !staffName || !customerName) {
        return res.status(400).json({ error: 'Required fields are missing.' });
    }

    try {
        // Fetch or create staff and customer
        const staff = await Staffs.findOrCreate({ where: { staffName } });
        const customer = await Customers.findOrCreate({ where: { customerName } });

        // Get product ID
        const product = await Products.findOne({ where: { name } });
        if (!product) {
            return res.status(404).json({ error: 'Product not found.' });
        }

        // Insert into sales table
        const sale = await Sales.create({
            productId: product.id,
            name,
            totalPrice,
            salesPrice,
            salesQty,
            saleNote,
            saleStatus,
            paymentStatus,
        });

        res.status(201).json({ message: 'Sale recorded successfully.', sale });
    } catch (err) {
        res.status(500).json({ error: 'Failed to process sale.', details: err.message });
    }
});

app.get('/inventory-notifications', validateSession, async (req, res) => {
    try {
        const lowStockThreshold = 10;
        const highStockThreshold = 1000;

        const inventoryNotifications = await Inventory.findAll({
            include: [{
                model: Products,
                attributes: ['imagePath'],
            }],
            where: {
                [Sequelize.Op.or]: [
                    { availableStock: { [Sequelize.Op.lt]: lowStockThreshold } },
                    { availableStock: { [Sequelize.Op.gt]: highStockThreshold } },
                ],
            },
            order: [['lastUpdated', 'DESC']],
        });

        res.json(inventoryNotifications);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch inventory notifications.', details: err.message });
    }
});

app.post('/sales/:id/pdf', validateSession, async (req, res) => {
    const saleId = req.params.id;

    try {
        const sale = await Sales.findByPk(saleId);
        if (!sale) {
            return res.status(404).json({ error: 'Sale not found.' });
        }

        // Generate PDF
        const pdf = new PDFDocument();
        const pdfPath = path.join(__dirname, `sale_${saleId}.pdf`);
        pdf.pipe(fs.createWriteStream(pdfPath));

        pdf.fontSize(16).text('Sales Record', { align: 'center' });
        pdf.moveDown();
        pdf.fontSize(12).text(`Sale Date: ${sale.saleDate}`);
        pdf.text(`Product Name: ${sale.name}`);
        pdf.text(`Total Price: ${sale.totalPrice}`);
        pdf.text(`Sales Price: ${sale.salesPrice}`);
        pdf.end();

        res.download(pdfPath, `sale_${saleId}.pdf`, () => {
            fs.unlinkSync(pdfPath); // Delete file after download
        });
    } catch (err) {
        res.status(500).json({ error: 'Failed to generate PDF.', details: err.message });
    }
});

// Start Server
app.listen(3000, () => {
    console.log('Server is running on http://localhost:3000');
});

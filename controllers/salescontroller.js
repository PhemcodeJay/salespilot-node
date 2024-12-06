const express = require('express');
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

// Models
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

const Staffs = sequelize.define('Staffs', {
    staffName: { type: DataTypes.STRING },
});

const Customers = sequelize.define('Customers', {
    customerName: { type: DataTypes.STRING },
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CRUD Operations for Sales

// Create Sale
app.post('/sales', async (req, res) => {
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

// Read All Sales
app.get('/sales', async (req, res) => {
    try {
        const sales = await Sales.findAll();
        res.status(200).json(sales);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch sales.', details: err.message });
    }
});

// Read Single Sale
app.get('/sales/:id', async (req, res) => {
    try {
        const sale = await Sales.findByPk(req.params.id);
        if (!sale) {
            return res.status(404).json({ error: 'Sale not found.' });
        }
        res.status(200).json(sale);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch sale.', details: err.message });
    }
});

// Update Sale
app.put('/sales/:id', async (req, res) => {
    const { saleStatus, salesPrice, totalPrice, salesQty, paymentStatus } = req.body;

    try {
        const sale = await Sales.findByPk(req.params.id);
        if (!sale) {
            return res.status(404).json({ error: 'Sale not found.' });
        }

        sale.saleStatus = saleStatus || sale.saleStatus;
        sale.salesPrice = salesPrice || sale.salesPrice;
        sale.totalPrice = totalPrice || sale.totalPrice;
        sale.salesQty = salesQty || sale.salesQty;
        sale.paymentStatus = paymentStatus || sale.paymentStatus;

        await sale.save();
        res.status(200).json({ message: 'Sale updated successfully.', sale });
    } catch (err) {
        res.status(500).json({ error: 'Failed to update sale.', details: err.message });
    }
});

// Delete Sale
app.delete('/sales/:id', async (req, res) => {
    try {
        const sale = await Sales.findByPk(req.params.id);
        if (!sale) {
            return res.status(404).json({ error: 'Sale not found.' });
        }

        await sale.destroy();
        res.status(200).json({ message: 'Sale deleted successfully.' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete sale.', details: err.message });
    }
});

// Generate PDF for Sale
app.post('/sales/:id/pdf', async (req, res) => {
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
        pdf.text(`Sales Quantity: ${sale.salesQty}`);
        pdf.text(`Payment Status: ${sale.paymentStatus}`);
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

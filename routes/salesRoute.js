const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const pool = require('../models/db');

// POST: Generate PDF for a sale
async function generateSalePdf(req, res) {
    const saleId = req.params.id;

    try {
        const [sale] = await pool.execute('SELECT * FROM sales WHERE id = ?', [saleId]);
        if (!sale.length) {
            return res.status(404).json({ error: 'Sale not found.' });
        }

        // Generate PDF
        const pdf = new PDFDocument();
        const pdfPath = path.join(__dirname, `../pdfs/sale_${saleId}.pdf`);
        pdf.pipe(fs.createWriteStream(pdfPath));

        pdf.fontSize(16).text('Sales Record', { align: 'center' });
        pdf.moveDown();
        pdf.fontSize(12).text(`Sale Date: ${sale[0].saleDate}`);
        pdf.text(`Product Name: ${sale[0].name}`);
        pdf.text(`Total Price: ${sale[0].totalPrice}`);
        pdf.text(`Sales Price: ${sale[0].salesPrice}`);
        pdf.end();

        res.download(pdfPath, `sale_${saleId}.pdf`, () => {
            fs.unlinkSync(pdfPath); // Delete file after download
        });
    } catch (err) {
        res.status(500).json({ error: 'Failed to generate PDF.', details: err.message });
    }
}

module.exports = { generateSalePdf };

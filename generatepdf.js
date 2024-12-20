const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// Assuming you have all your models already imported
const Customers = require('./models/Customers');
const Expenses = require('./models/Expenses');
const Suppliers = require('./models/Suppliers');
const Staff = require('./models/Staff');
const Sales = require('./models/Sales');
const Products = require('./models/Products');

// PDF generation middleware
async function generatePDF(req, res) {
  try {
    // Fetch data using models
    const customers = await Customers.getAllCustomers();
    const expenses = await Expenses.getAllExpenses();
    const suppliers = await Suppliers.getAllSuppliers();
    const staffMembers = await Staff.getAllStaffMembers();
    const salesData = await Sales.getAllSales();
    const products = await Products.getAllProducts();

    // Create a PDF document
    const doc = new PDFDocument();

    // Set the output file path (you can adjust this or send it directly to the browser)
    const outputPath = path.join(__dirname, 'output', 'report.pdf');
    doc.pipe(fs.createWriteStream(outputPath));

    // Add title to the PDF
    doc.fontSize(18).text('Business Report', { align: 'center' });
    doc.moveDown();

    // Add customer data to the PDF
    doc.fontSize(12).text('Customers:', { underline: true });
    customers.forEach((customer) => {
      doc.text(`Name: ${customer.customer_name}, Email: ${customer.customer_email}`);
    });
    doc.moveDown();

    // Add expense data to the PDF
    doc.text('Expenses:', { underline: true });
    expenses.forEach((expense) => {
      doc.text(`Description: ${expense.description}, Amount: $${expense.amount}`);
    });
    doc.moveDown();

    // Add supplier data to the PDF
    doc.text('Suppliers:', { underline: true });
    suppliers.forEach((supplier) => {
      doc.text(`Supplier Name: ${supplier.supplier_name}, Product: ${supplier.product_name}, Supply Quantity: ${supplier.supply_qty}`);
    });
    doc.moveDown();

    // Add staff data to the PDF
    doc.text('Staff Members:', { underline: true });
    staffMembers.forEach((staff) => {
      doc.text(`Name: ${staff.staff_name}, Email: ${staff.staff_email}`);
    });
    doc.moveDown();

    // Add sales data to the PDF
    doc.text('Sales Data:', { underline: true });
    salesData.forEach((sale) => {
      doc.text(`Sale ID: ${sale.id}, Customer: ${sale.customer_name}, Total Amount: $${sale.total_amount}`);
    });
    doc.moveDown();

    // Add product data to the PDF
    doc.text('Products:', { underline: true });
    products.forEach((product) => {
      doc.text(`Product Name: ${product.product_name}, Category: ${product.category_name}`);
    });

    // Finalize the document and end the stream
    doc.end();

    // Respond with the generated PDF file path or send the PDF directly
    res.download(outputPath, 'business_report.pdf', (err) => {
      if (err) {
        console.error('Error downloading the PDF:', err);
        res.status(500).send('Error generating PDF');
      } else {
        console.log('PDF generated and sent successfully');
      }
    });
  } catch (error) {
    console.error('Error generating PDF:', error);
    res.status(500).send('Error generating PDF');
  }
}

module.exports = generatePDF;

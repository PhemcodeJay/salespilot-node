const express = require('express');
const session = require('express-session');
const mysql = require('mysql2');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');
const pdfkit = require('pdfkit');
const moment = require('moment'); // For date manipulation

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

// Generate PDF report of all product reports
const generateProductReportsPdf = async (req, res) => {
    try {
        // Fetch all product reports
        const [productReports] = await pool.promise().query('SELECT * FROM product_reports ORDER BY date DESC');

        if (productReports.length === 0) {
            return res.status(404).json({ message: 'No product reports found' });
        }

        // Create the reports directory if it doesn't exist
        const reportsDir = path.join(__dirname, '..', 'reports');
        if (!fs.existsSync(reportsDir)) {
            fs.mkdirSync(reportsDir);
        }

        // Create a new PDF document
        const doc = new pdfkit();
        
        // Set the file name and path
        const filePath = path.join(reportsDir, `product_reports_report_${Date.now()}.pdf`);

        // Pipe the document to a file
        doc.pipe(fs.createWriteStream(filePath));

        // Title and headers
        doc.fontSize(18).text('Product Report', { align: 'center' });
        doc.moveDown();
        doc.fontSize(12).text(`Date Generated: ${new Date().toLocaleString()}`, { align: 'center' });
        doc.moveDown();
        
        doc.text('--------------------------------------', { align: 'center' });
        doc.moveDown();
        
        doc.text('ID | Description | Amount | Date | Category');
        doc.text('--------------------------------------');
        
        // Add product reports data to the PDF
        productReports.forEach(productReport => {
            doc.text(`${productReport.id} | ${productReport.description} | $${productReport.amount} | ${productReport.date} | ${productReport.category}`);
        });

        // End and save the PDF document
        doc.end();

        // Send the response with the file path or download option
        res.status(200).json({ message: 'PDF report generated successfully', filePath: filePath });
    } catch (err) {
        return res.status(500).json({ message: 'Error generating PDF', error: err.message });
    }
};

// Fetch user details by token
const fetchUserInfo = (username) => {
    return pool.promise().query('SELECT username, email, date, phone, location, user_image FROM users WHERE username = ?', [username])
        .then(([results]) => {
            if (results.length === 0) throw new Error('User not found.');
            return results[0];
        });
};

const router = express.Router();

// Session configuration
router.use(session({
    secret: 'your_secret_key',
    resave: false,
    saveUninitialized: true,
    cookie: {
        secure: true, // Set to true in production
        httpOnly: true,
        maxAge: 86400000 // 1 day in milliseconds
    }
}));

// Middleware to check session for username
const checkSession = (req, res, next) => {
    if (!req.session.username) {
        return res.status(403).send("Error: No username found in session.");
    }
    next();
};

router.use(checkSession);

// Fetch user details from the database
const getUserInfo = (username) => {
    return pool.promise().query('SELECT * FROM users WHERE username = ?', [username])
        .then(([results]) => {
            if (results.length === 0) throw new Error("Error: User not found.");
            return results[0];
        });
};

// Calculate product category metrics
const calculateProductCategoryMetrics = async () => {
    const query = `
        SELECT
            categories.category_name AS category_name,
            COUNT(products.id) AS num_products,
            SUM(sales.sales_qty * products.price) AS total_sales,
            SUM(sales.sales_qty) AS total_quantity,
            SUM(sales.sales_qty * (products.price - products.cost)) AS total_profit,
            SUM(sales.sales_qty * products.cost) AS total_expenses,
            (SUM(products.price) / NULLIF(SUM(products.cost), 0)) * 100 AS sell_through_rate
        FROM products
        INNER JOIN categories ON products.category_id = categories.category_id
        LEFT JOIN sales ON sales.product_id = products.id
        GROUP BY categories.category_name
    `;
    const [results] = await pool.promise().query(query);
    return results;
};

// Get revenue by category and calculate financial metrics
const generateReportMetrics = (salesCategoryData) => {
    let totalSales = 0, totalQuantity = 0, totalProfit = 0;

    salesCategoryData.forEach(category => {
        totalSales += category.total_sales;
        totalQuantity += category.total_quantity;
        totalProfit += category.total_profit;
    });

    const revenueByCategory = JSON.stringify(salesCategoryData);
    const grossMargin = totalSales - totalProfit;
    const netMargin = totalProfit; // Assuming total profit represents net margin
    const inventoryTurnoverRate = totalQuantity > 0 ? (totalSales / totalQuantity) : 0;
    const stockToSalesRatio = totalSales > 0 ? (totalQuantity / totalSales) * 100 : 0;
    const sellThroughRate = totalQuantity > 0 ? (totalSales / totalQuantity) / 100 : 0;

    return {
        totalSales,
        totalQuantity,
        totalProfit,
        revenueByCategory,
        grossMargin,
        netMargin,
        inventoryTurnoverRate,
        stockToSalesRatio,
        sellThroughRate
    };
};

// Fetch previous year's revenue for year-over-year growth
const getPreviousYearRevenue = async (date) => {
    const previousYearDate = moment(date).subtract(1, 'year').format('YYYY-MM-DD');
    const query = 'SELECT revenue FROM sales_analytics WHERE date LIKE ?';
    const [results] = await pool.promise().query(query, [`${previousYearDate}%`]);
    return results.length > 0 ? results[0].revenue : 0;
};

// Calculate Year-Over-Year Growth
const calculateYearOverYearGrowth = (totalSales, previousYearRevenue) => {
    return previousYearRevenue > 0 ? ((totalSales - previousYearRevenue) / previousYearRevenue) * 100 : 0;
};

// Check if a report already exists for the current date
const checkIfReportExists = async (date) => {
    const query = 'SELECT * FROM sales_analytics WHERE date = ?';
    const [results] = await pool.promise().query(query, [date]);
    return results.length > 0 ? results[0] : null;
};

// Insert or update the report in the database
const saveReport = async (date, reportData, existingReport = null) => {
    const query = existingReport 
        ? 'UPDATE sales_analytics SET ? WHERE id = ?' 
        : 'INSERT INTO sales_analytics SET ?';

    const [results] = await pool.promise().query(query, [reportData, existingReport ? existingReport.id : null]);
    return results;
};

// Fetch inventory and report notifications
const getNotifications = async () => {
    const inventoryQuery = `
        SELECT * FROM inventory
        WHERE available_stock < 10 OR available_stock > 1000
        ORDER BY last_updated DESC
    `;
    const reportQuery = `
        SELECT * FROM reports
        WHERE revenue > 10000 OR revenue < 1000
        ORDER BY report_date DESC
    `;
    const [inventoryNotifications] = await pool.promise().query(inventoryQuery);
    const [reportNotifications] = await pool.promise().query(reportQuery);

    return { inventoryNotifications, reportNotifications };
};

// Main function to generate the report
router.get('/generate-report', async (req, res) => {
    try {
        const username = req.session.username;
        const userInfo = await getUserInfo(username);

        const salesCategoryData = await calculateProductCategoryMetrics();
        const reportMetrics = await generateReportMetrics(salesCategoryData);
        const previousYearRevenue = await getPreviousYearRevenue(userInfo.date);
        const yearOverYearGrowth = calculateYearOverYearGrowth(reportMetrics.totalSales, previousYearRevenue);

        const existingReport = await checkIfReportExists(userInfo.date);
        const reportData = {
            revenue: reportMetrics.totalSales,
            profit_margin: (reportMetrics.totalSales > 0) ? (reportMetrics.totalProfit / reportMetrics.totalSales) * 100 : 0,
            revenue_by_category: reportMetrics.revenueByCategory,
            year_over_year_growth: yearOverYearGrowth,
            inventory_turnover_rate: reportMetrics.inventoryTurnoverRate,
            stock_to_sales_ratio: reportMetrics.stockToSalesRatio,
            sell_through_rate: reportMetrics.sellThroughRate,
            gross_margin: reportMetrics.grossMargin,
            net_margin: reportMetrics.netMargin,
            total_sales: reportMetrics.totalSales,
            total_quantity: reportMetrics.totalQuantity,
            total_profit: reportMetrics.totalProfit
        };

        await saveReport(userInfo.date, reportData, existingReport);

        const notifications = await getNotifications();

        res.render('report-dashboard', {
            userInfo,
            reportMetrics,
            notifications,
            salesCategoryData
        });

    } catch (err) {
        console.error('Error generating report:', err.message);
        res.status(500).json({ message: 'Error generating report' });
    }
});

module.exports = router;

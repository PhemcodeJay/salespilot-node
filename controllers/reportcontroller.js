const express = require('express');
const session = require('express-session');
const mysql = require('mysql2');
const { Op } = require('sequelize');
const moment = require('moment'); // For date manipulation

// MySQL connection setup
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
});

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
async function getUserInfo(username) {
    const query = 'SELECT * FROM users WHERE username = ?';
    return new Promise((resolve, reject) => {
        pool.query(query, [username], (err, results) => {
            if (err) reject(new Error("Error: User not found."));
            if (results.length === 0) reject(new Error("Error: User not found."));
            resolve(results[0]);
        });
    });
}

// Calculate product category metrics
async function calculateProductCategoryMetrics() {
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
    return new Promise((resolve, reject) => {
        pool.query(query, (err, results) => {
            if (err) reject(err);
            resolve(results);
        });
    });
}

// Get revenue by category and calculate financial metrics
async function generateReportMetrics(salesCategoryData) {
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
}

// Fetch previous year's revenue for year-over-year growth
async function getPreviousYearRevenue(date) {
    const previousYearDate = moment(date).subtract(1, 'year').format('YYYY-MM-DD');
    const query = 'SELECT revenue FROM sales_analytics WHERE date LIKE ?';
    return new Promise((resolve, reject) => {
        pool.query(query, [`${previousYearDate}%`], (err, results) => {
            if (err) reject(err);
            resolve(results.length > 0 ? results[0].revenue : 0);
        });
    });
}

// Calculate Year-Over-Year Growth
function calculateYearOverYearGrowth(totalSales, previousYearRevenue) {
    return previousYearRevenue > 0 ? ((totalSales - previousYearRevenue) / previousYearRevenue) * 100 : 0;
}

// Check if a report already exists for the current date
async function checkIfReportExists(date) {
    const query = 'SELECT * FROM sales_analytics WHERE date = ?';
    return new Promise((resolve, reject) => {
        pool.query(query, [date], (err, results) => {
            if (err) reject(err);
            resolve(results.length > 0 ? results[0] : null);
        });
    });
}

// Insert or update the report in the database
async function saveReport(date, reportData, existingReport = null) {
    if (existingReport) {
        const query = 'UPDATE sales_analytics SET ? WHERE id = ?';
        return new Promise((resolve, reject) => {
            pool.query(query, [reportData, existingReport.id], (err, results) => {
                if (err) reject(err);
                resolve(results);
            });
        });
    } else {
        const query = 'INSERT INTO sales_analytics SET ?';
        return new Promise((resolve, reject) => {
            pool.query(query, [reportData], (err, results) => {
                if (err) reject(err);
                resolve(results);
            });
        });
    }
}

// Fetch inventory and report notifications
async function getNotifications() {
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
    return new Promise((resolve, reject) => {
        pool.query(inventoryQuery, (err, inventoryNotifications) => {
            if (err) reject(err);
            pool.query(reportQuery, (err, reportNotifications) => {
                if (err) reject(err);
                resolve({ inventoryNotifications, reportNotifications });
            });
        });
    });
}

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

        const { inventoryNotifications, reportNotifications } = await getNotifications();

        res.json({
            userInfo,
            reportData,
            inventoryNotifications,
            reportNotifications
        });
    } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");
    }
});

module.exports = router;

const mysql = require('mysql2');
const dayjs = require('day');

// Create a MySQL connection pool
const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'salespilot'
});

// Helper function to execute a query
const executeQuery = (query, params) => {
    return new Promise((resolve, reject) => {
        pool.execute(query, params, (err, results) => {
            if (err) {
                reject(err);
            } else {
                resolve(results);
            }
        });
    });
};

// Controller function to handle the report logic
exports.generateReport = async (req, res) => {
    try {
        // Start the session (equivalent to PHP session_start)
        if (!req.session || !req.session.username) {
            return res.status(400).json({ error: 'No username found in session.' });
        }

        const username = req.session.username;

        // Retrieve user information from the 'users' table
        const userQuery = 'SELECT username, email, date FROM users WHERE username = ?';
        const [userInfo] = await executeQuery(userQuery, [username]);

        if (!userInfo) {
            return res.status(400).json({ error: 'User not found.' });
        }

        const email = userInfo.email;
        const registrationDate = userInfo.date;

        // Calculate metrics for each product
        const productMetricsQuery = `
            SELECT 
                products.id AS product_id,
                products.name AS product_name,
                SUM(sales.sales_qty) AS total_quantity,
                SUM(sales.sales_qty * products.price) AS total_sales,
                SUM(sales.sales_qty * products.cost) AS total_cost,
                SUM(sales.sales_qty * (products.price - products.cost)) AS total_profit,
                SUM(sales.sales_qty) / NULLIF(SUM(products.stock_qty), 0) AS inventory_turnover_rate, 
                (SUM(products.price) / NULLIF(SUM(products.cost), 0)) * 100 AS sell_through_rate 
            FROM sales
            INNER JOIN products ON sales.product_id = products.id
            GROUP BY products.id
        `;
        const productMetricsData = await executeQuery(productMetricsQuery);

        // Initialize metrics for the entire report
        let totalSales = 0, totalQuantity = 0, totalProfit = 0, totalCost = 0;

        productMetricsData.forEach(product => {
            totalSales += product.total_sales;
            totalQuantity += product.total_quantity;
            totalProfit += product.total_profit;
            totalCost += product.total_cost;
        });

        // Ensure total expenses are calculated correctly
        const totalExpenses = totalCost;

        // Additional calculations
        const grossMargin = (totalSales > 0) ? totalSales - totalExpenses : 0;
        const netMargin = (totalSales > 0) ? totalProfit - totalExpenses : 0;
        const profitMargin = (totalSales > 0) ? (totalProfit / totalSales) * 100 : 0;
        const inventoryTurnoverRate = (totalQuantity > 0) ? (totalCost / (totalCost / 2)) : 0;
        const stockToSalesRatio = (totalSales > 0) ? (totalQuantity / totalSales) * 100 : 0;
        const sellThroughRate = (totalQuantity > 0) ? (totalSales / totalQuantity) / 100 : 0;

        // Encode revenue by product as JSON
        const revenueByProduct = JSON.stringify(productMetricsData);

        // Check if a report for the current date already exists
        const reportDate = dayjs().format('YYYY-MM-DD');
        const checkReportQuery = 'SELECT reports_id FROM reports WHERE report_date = ?';
        const [existingReport] = await executeQuery(checkReportQuery, [reportDate]);

        if (existingReport) {
            // Update existing report
            const updateQuery = `
                UPDATE reports
                SET 
                    revenue = ?, 
                    profit_margin = ?, 
                    revenue_by_product = ?, 
                    gross_margin = ?, 
                    net_margin = ?, 
                    inventory_turnover_rate = ?, 
                    stock_to_sales_ratio = ?, 
                    sell_through_rate = ?, 
                    total_sales = ?, 
                    total_quantity = ?, 
                    total_profit = ?, 
                    total_expenses = ?, 
                    net_profit = ?
                WHERE reports_id = ?
            `;
            await executeQuery(updateQuery, [
                totalSales, profitMargin, revenueByProduct, grossMargin, netMargin, 
                inventoryTurnoverRate, stockToSalesRatio, sellThroughRate, totalSales,
                totalQuantity, totalProfit, totalExpenses, netMargin, existingReport.reports_id
            ]);
        } else {
            // Insert new report
            const insertQuery = `
                INSERT INTO reports (
                    report_date, revenue, profit_margin, revenue_by_product, gross_margin,
                    net_margin, inventory_turnover_rate, stock_to_sales_ratio, sell_through_rate,
                    total_sales, total_quantity, total_profit, total_expenses, net_profit
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;
            await executeQuery(insertQuery, [
                reportDate, totalSales, profitMargin, revenueByProduct, grossMargin, netMargin, 
                inventoryTurnoverRate, stockToSalesRatio, sellThroughRate, totalSales,
                totalQuantity, totalProfit, totalExpenses, netMargin
            ]);
        }

        // Return the generated report
        const metricsQuery = 'SELECT * FROM reports WHERE report_date = ?';
        const [metricsData] = await executeQuery(metricsQuery, [reportDate]);

        res.json(metricsData);
    } catch (err) {
        console.error('Error generating report:', err);
        res.status(500).json({ error: 'Failed to generate report.' });
    }
};

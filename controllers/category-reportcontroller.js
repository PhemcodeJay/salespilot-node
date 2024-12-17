
const mysql = require('mysql2/promise');
const session = require('express-session');

// Initialize session settings
const sessionMiddleware = session({
    secret: 'yourSecretKey', // Replace with a strong secret key
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: true, // Use 'true' if running HTTPS
        httpOnly: true,
        maxAge: 86400 * 1000, // 1 day
    }
});

// Database connection settings
const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'salespilot'
});

// Controller function to handle analytics
async function generateReport(req, res) {
    if (!req.session.username) {
        return res.status(401).json({ error: 'No username found in session.' });
    }

    const username = req.session.username;

    try {
        // Step 1: Fetch user data
        const [user] = await pool.execute(
            'SELECT username, email, date FROM users WHERE username = ?',
            [username]
        );

        if (user.length === 0) {
            return res.status(404).json({ error: 'User not found.' });
        }

        const { email, date } = user[0];

        // Step 2: Fetch sales and metrics by category
        const [salesData] = await pool.execute(`
            SELECT 
                c.category_name AS category_name,
                COUNT(p.id) AS num_products,
                SUM(s.sales_qty * p.price) AS total_sales,
                SUM(s.sales_qty) AS total_quantity,
                SUM(s.sales_qty * (p.price - p.cost)) AS total_profit,
                SUM(s.sales_qty * p.cost) AS total_expenses,
                (SUM(s.sales_qty) / NULLIF(SUM(p.stock_qty), 0)) * 100 AS sell_through_rate
            FROM products p
            INNER JOIN categories c ON p.category_id = c.category_id
            LEFT JOIN sales s ON s.product_id = p.id
            GROUP BY c.category_name
        `);

        // Step 3: Calculate overall metrics
        let totalSales = 0, totalQuantity = 0, totalProfit = 0;

        salesData.forEach(category => {
            totalSales += category.total_sales || 0;
            totalQuantity += category.total_quantity || 0;
            totalProfit += category.total_profit || 0;
        });

        const grossMargin = totalSales - totalProfit;
        const netMargin = totalProfit;
        const inventoryTurnoverRate = totalQuantity > 0 ? (totalSales / totalQuantity) : 0;
        const stockToSalesRatio = totalSales > 0 ? (totalQuantity / totalSales) * 100 : 0;
        const sellThroughRate = totalQuantity > 0 ? (totalSales / totalQuantity) / 100 : 0;

        // Step 4: Year-over-Year growth
        const previousYearDate = new Date(new Date(date).setFullYear(new Date(date).getFullYear() - 1)).toISOString().split('T')[0];
        const [previousRevenue] = await pool.execute(
            'SELECT revenue FROM sales_analytics WHERE date = ?',
            [previousYearDate]
        );

        const previousRevenueValue = previousRevenue[0]?.revenue || 0;
        const yearOverYearGrowth = previousRevenueValue > 0
            ? ((totalSales - previousRevenueValue) / previousRevenueValue) * 100
            : 0;

        // Step 5: Check existing report
        const [existingReport] = await pool.execute(
            'SELECT id FROM sales_analytics WHERE date = ?',
            [date]
        );

        const reportData = {
            revenue: totalSales,
            profit_margin: totalSales > 0 ? (totalProfit / totalSales) * 100 : 0,
            revenue_by_category: JSON.stringify(salesData),
            year_over_year_growth: yearOverYearGrowth,
            inventory_turnover_rate: inventoryTurnoverRate,
            stock_to_sales_ratio: stockToSalesRatio,
            sell_through_rate: sellThroughRate,
            gross_margin: grossMargin,
            net_margin: netMargin,
            total_sales: totalSales,
            total_quantity: totalQuantity,
            total_profit: totalProfit
        };

        if (existingReport.length > 0) {
            // Update existing report
            await pool.execute(`
                UPDATE sales_analytics
                SET 
                    revenue = ?, profit_margin = ?, revenue_by_category = ?,
                    year_over_year_growth = ?, inventory_turnover_rate = ?,
                    stock_to_sales_ratio = ?, sell_through_rate = ?, 
                    gross_margin = ?, net_margin = ?, total_sales = ?, 
                    total_quantity = ?, total_profit = ?
                WHERE id = ?
            `, [
                reportData.revenue, reportData.profit_margin, reportData.revenue_by_category,
                reportData.year_over_year_growth, reportData.inventory_turnover_rate,
                reportData.stock_to_sales_ratio, reportData.sell_through_rate,
                reportData.gross_margin, reportData.net_margin, reportData.total_sales,
                reportData.total_quantity, reportData.total_profit, existingReport[0].id
            ]);
        } else {
            // Insert new report
            await pool.execute(`
                INSERT INTO sales_analytics (
                    date, revenue, profit_margin, revenue_by_category, year_over_year_growth,
                    inventory_turnover_rate, stock_to_sales_ratio, sell_through_rate,
                    gross_margin, net_margin, total_sales, total_quantity, total_profit
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                date, reportData.revenue, reportData.profit_margin, reportData.revenue_by_category,
                reportData.year_over_year_growth, reportData.inventory_turnover_rate,
                reportData.stock_to_sales_ratio, reportData.sell_through_rate,
                reportData.gross_margin, reportData.net_margin, reportData.total_sales,
                reportData.total_quantity, reportData.total_profit
            ]);
        }

        // Step 6: Fetch all reports
        const [allMetrics] = await pool.execute(
            'SELECT * FROM sales_analytics ORDER BY date ASC'
        );

        if (allMetrics.length === 0) {
            return res.status(404).json({ error: 'No report data found.' });
        }

        return res.status(200).json({ metrics: allMetrics });
    } catch (error) {
        console.error('Error generating report:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}

module.exports = {
    sessionMiddleware,
    generateReport
};

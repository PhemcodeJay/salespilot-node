const express = require('express');
const router = express.Router();
const path = require('path');
const dayjs = require('dayjs');
const pool = require('../models/db'); // Assuming MySQL database connection
const session = require('express-session');
const verifyToken = require('../middleware/auth'); // Middleware for verifying token (if required)
const chartReportController = require('../controllers/chart-reportcontroller'); // The controller for chart-related actions

// Middleware for handling sessions
const sessionMiddleware = session({
  secret: 'your-secret-key', // Replace with your secret key
  resave: false,
  saveUninitialized: true,
  cookie: {
    maxAge: 86400 * 1000, // 1 day
    secure: true,
    httpOnly: true,
  },
});

router.use(sessionMiddleware);

// Helper function to execute queries
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

// Route for serving 'analytics-report.html'
router.get('/analytics', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/analytics-report.html'));
});

// Chart data route
router.get('/chart-data', async (req, res) => {
  try {
    const range = req.query.range || 'yearly';
    let startDate, endDate;

    // Define the date range based on the selected period
    switch (range) {
      case 'weekly':
        startDate = dayjs().startOf('week').format('YYYY-MM-DD');
        endDate = dayjs().endOf('week').format('YYYY-MM-DD');
        break;
      case 'monthly':
        startDate = dayjs().startOf('month').format('YYYY-MM-DD');
        endDate = dayjs().endOf('month').format('YYYY-MM-DD');
        break;
      case 'yearly':
      default:
        startDate = dayjs().startOf('year').format('YYYY-MM-DD');
        endDate = dayjs().format('YYYY-MM-DD');
        break;
    }

    // Queries for fetching the data
    const queries = {
      salesData: `SELECT DATE_FORMAT(sale_date, '%b %y') AS date, SUM(sales_qty) AS total_sales
                  FROM sales
                  WHERE DATE(sale_date) BETWEEN ? AND ?
                  GROUP BY DATE_FORMAT(sale_date, '%b %y')`,
      metricsData: `SELECT DATE_FORMAT(report_date, '%b %y') AS date,
                           AVG(sell_through_rate) AS avg_sell_through_rate,
                           AVG(inventory_turnover_rate) AS avg_inventory_turnover_rate
                  FROM reports
                  WHERE DATE(report_date) BETWEEN ? AND ?
                  GROUP BY DATE_FORMAT(report_date, '%b %y')`,
      revenueByProductData: `SELECT report_date, revenue_by_product
                             FROM reports
                             WHERE DATE(report_date) BETWEEN ? AND ?`,
      revenueData: `SELECT DATE_FORMAT(sale_date, '%b %y') AS date, SUM(sales_qty * price) AS revenue
                    FROM sales
                    JOIN products ON sales.product_id = products.id
                    WHERE DATE(sale_date) BETWEEN ? AND ?
                    GROUP BY DATE_FORMAT(sale_date, '%b %y')`,
      totalCostData: `SELECT DATE_FORMAT(sale_date, '%b %y') AS date, SUM(sales_qty * cost) AS total_cost
                      FROM sales
                      JOIN products ON sales.product_id = products.id
                      WHERE DATE(sale_date) BETWEEN ? AND ?
                      GROUP BY DATE_FORMAT(sale_date, '%b %y')`,
      expenseData: `SELECT DATE_FORMAT(expense_date, '%b %y') AS date, SUM(amount) AS total_expenses
                    FROM expenses
                    WHERE DATE(expense_date) BETWEEN ? AND ?
                    GROUP BY DATE_FORMAT(expense_date, '%b %y')`,
    };

    // Execute the queries
    const [salesData, metricsData, revenueByProductData, revenueData, totalCostData, expenseData] = await Promise.all([
      executeQuery(queries.salesData, [startDate, endDate]),
      executeQuery(queries.metricsData, [startDate, endDate]),
      executeQuery(queries.revenueByProductData, [startDate, endDate]),
      executeQuery(queries.revenueData, [startDate, endDate]),
      executeQuery(queries.totalCostData, [startDate, endDate]),
      executeQuery(queries.expenseData, [startDate, endDate]),
    ]);

    // Process revenueByProduct data
    let revenueByProduct = {};
    revenueByProductData.forEach(report => {
      const products = JSON.parse(report.revenue_by_product || '[]');
      products.forEach(product => {
        if (product.product_name && product.total_sales) {
          revenueByProduct[product.product_name] = (revenueByProduct[product.product_name] || 0) + parseFloat(product.total_sales);
        }
      });
    });

    // Top 5 products by sales
    const top5Products = Object.entries(revenueByProduct)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([product_name, total_sales]) => ({ product_name, total_sales }));

    // Combine revenue, total cost, and expenses into a single dataset
    const combinedData = revenueData.map(data => {
      const date = data.date;
      const revenue = parseFloat(data.revenue || 0);
      const totalCost = parseFloat(totalCostData.find(item => item.date === date)?.total_cost || 0);
      const expenses = parseFloat(expenseData.find(item => item.date === date)?.total_expenses || 0);
      const totalExpenses = totalCost + expenses;
      return {
        date,
        revenue: revenue.toFixed(2),
        total_expenses: totalExpenses.toFixed(2),
        profit: (revenue - totalExpenses).toFixed(2),
      };
    });

    // Final response to the frontend
    res.json({
      'apex-basic': salesData,
      'apex-line-area': metricsData,
      'am-3dpie-chart': top5Products,
      'apex-column': combinedData,
    });

  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ error: 'Failed to retrieve data.' });
  }
});

module.exports = router;

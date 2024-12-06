const express = require('express');
const router = express.Router();
const dayjs = require('dayjs'); // Replacing moment with day.js
const mysql = require('mysql2');
const path = require('path'); // For serving static files
const reportsController = require('./controllers/analyticscontroller');
const analyticsController = require('./controllers/analyticscontroller'); // Adjust path as necessary

// Create a MySQL connection pool
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '', // Your DB password
  database: 'dbs13455438',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Helper function to execute queries
const executeQuery = (query, params = []) => {
  return new Promise((resolve, reject) => {
    pool.execute(query, params, (err, results) => {
      if (err) {
        console.error('Query Execution Error:', err.message);
        reject(err);
      } else {
        resolve(results);
      }
    });
  });
};

// Routes for Reports
router.post('/reports', reportsController.createReport);
router.get('/reports/:reports_id', reportsController.getReportById);
router.get('/reports', reportsController.getAllReports);
router.put('/reports/:reports_id', reportsController.updateReport);
router.delete('/reports/:reports_id', reportsController.deleteReport);

// Serve 'analytics.html' page
router.get('/analytics', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/analytics.html'));
});

// Chart data route
router.get('/chart-data', async (req, res) => {
  try {
    const range = req.query.range || 'yearly';
    let startDate, endDate;

    // Define date ranges based on the period
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
        startDate = dayjs().startOf('year').format('YYYY-MM-DD');
        endDate = dayjs().format('YYYY-MM-DD');
        break;
      default:
        startDate = dayjs().startOf('year').format('YYYY-MM-DD');
        endDate = dayjs().format('YYYY-MM-DD');
    }

    // Fetch sales data
    const salesQuery = `
      SELECT DATE_FORMAT(sale_date, '%b %y') AS date, SUM(sales_qty) AS total_sales
      FROM sales
      WHERE DATE(sale_date) BETWEEN ? AND ?
      GROUP BY DATE_FORMAT(sale_date, '%b %y')
    `;
    const salesData = await executeQuery(salesQuery, [startDate, endDate]);

    // Fetch metrics data
    const metricsQuery = `
      SELECT DATE_FORMAT(report_date, '%b %y') AS date,
             AVG(sell_through_rate) AS avg_sell_through_rate,
             AVG(inventory_turnover_rate) AS avg_inventory_turnover_rate
      FROM reports
      WHERE DATE(report_date) BETWEEN ? AND ?
      GROUP BY DATE_FORMAT(report_date, '%b %y')
    `;
    const metricsData = await executeQuery(metricsQuery, [startDate, endDate]);

    // Fetch revenue by product data
    const revenueByProductQuery = `
      SELECT report_date, revenue_by_product
      FROM reports
      WHERE DATE(report_date) BETWEEN ? AND ?
    `;
    const revenueByProductData = await executeQuery(revenueByProductQuery, [startDate, endDate]);

    // Process and aggregate revenue by product data
    const revenueByProduct = revenueByProductData.reduce((acc, report) => {
      const products = JSON.parse(report.revenue_by_product || '[]');
      products.forEach(({ product_name, total_sales }) => {
        if (product_name && total_sales) {
          acc[product_name] = (acc[product_name] || 0) + parseFloat(total_sales);
        }
      });
      return acc;
    }, {});

    const top5Products = Object.entries(revenueByProduct)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([product_name, total_sales]) => ({ product_name, total_sales }));

    // Fetch combined data for 3-column chart
    const revenueQuery = `
      SELECT DATE_FORMAT(sale_date, '%b %y') AS date, SUM(sales_qty * price) AS revenue
      FROM sales
      JOIN products ON sales.product_id = products.id
      WHERE DATE(sale_date) BETWEEN ? AND ?
      GROUP BY DATE_FORMAT(sale_date, '%b %y')
    `;
    const revenueData = await executeQuery(revenueQuery, [startDate, endDate]);

    const totalCostQuery = `
      SELECT DATE_FORMAT(sale_date, '%b %y') AS date, SUM(sales_qty * cost) AS total_cost
      FROM sales
      JOIN products ON sales.product_id = products.id
      WHERE DATE(sale_date) BETWEEN ? AND ?
      GROUP BY DATE_FORMAT(sale_date, '%b %y')
    `;
    const totalCostData = await executeQuery(totalCostQuery, [startDate, endDate]);

    const expenseQuery = `
      SELECT DATE_FORMAT(expense_date, '%b %y') AS date, SUM(amount) AS total_expenses
      FROM expenses
      WHERE DATE(expense_date) BETWEEN ? AND ?
      GROUP BY DATE_FORMAT(expense_date, '%b %y')
    `;
    const expenseData = await executeQuery(expenseQuery, [startDate, endDate]);

    const combinedData = revenueData.map(({ date, revenue }) => {
      const totalCost = parseFloat(totalCostData.find((item) => item.date === date)?.total_cost || 0);
      const expenses = parseFloat(expenseData.find((item) => item.date === date)?.total_expenses || 0);
      const totalExpenses = totalCost + expenses;
      const profit = revenue - totalExpenses;

      return {
        date,
        revenue: parseFloat(revenue).toFixed(2),
        total_expenses: totalExpenses.toFixed(2),
        profit: profit.toFixed(2),
      };
    });

    // Send the response
    res.json({
      'apex-basic': salesData,
      'apex-line-area': metricsData,
      'am-3dpie-chart': top5Products,
      'apex-column': combinedData,
    });
  } catch (err) {
    console.error('Error fetching chart data:', err.message);
    res.status(500).json({ error: 'Failed to retrieve chart data' });
  }
});

module.exports = router;

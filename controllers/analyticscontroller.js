const express = require('express');
const router = express.Router();
const moment = require('moment');
const mysql = require('mysql2');
const path = require('path'); // Path import for serving static files


// Create a MySQL connection pool
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '', // Your DB password
  database: 'dbs13455438'
});

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

// Routes for Reports
router.post('/reports', reportsController.createReport); // Create report
router.get('/reports/:reports_id', reportsController.getReportById); // Get report by ID
router.get('/reports', reportsController.getAllReports); // Get all reports
router.put('/reports/:reports_id', reportsController.updateReport); // Update report
router.delete('/reports/:reports_id', reportsController.deleteReport); // Delete report

// Serve 'analytics.html' page
router.get('/analytics', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/analytics.html'));
});

// GET route to fetch data for charts
router.get('/chart-data', async (req, res) => {
  try {
    const range = req.query.range || 'yearly';
    let startDate = '';
    let endDate = '';

    // Define the date range based on the selected period
    switch (range) {
      case 'weekly':
        startDate = moment().startOf('week').format('YYYY-MM-DD');
        endDate = moment().endOf('week').format('YYYY-MM-DD');
        break;
      case 'monthly':
        startDate = moment().startOf('month').format('YYYY-MM-DD');
        endDate = moment().endOf('month').format('YYYY-MM-DD');
        break;
      case 'yearly':
        startDate = moment().startOf('year').format('YYYY-MM-DD');
        endDate = moment().format('YYYY-MM-DD');
        break;
      default:
        startDate = moment().startOf('year').format('YYYY-MM-DD');
        endDate = moment().format('YYYY-MM-DD');
        break;
    }

    // Fetch sales quantity data for Apex Basic Chart
    const salesQuery = `SELECT DATE_FORMAT(sale_date, '%b %y') AS date, SUM(sales_qty) AS total_sales
                        FROM sales
                        WHERE DATE(sale_date) BETWEEN ? AND ?
                        GROUP BY DATE_FORMAT(sale_date, '%b %y')`;
    const salesData = await executeQuery(salesQuery, [startDate, endDate]);

    // Fetch metrics data for Apex Line Area Chart
    const metricsQuery = `SELECT DATE_FORMAT(report_date, '%b %y') AS date,
                                 AVG(sell_through_rate) AS avg_sell_through_rate,
                                 AVG(inventory_turnover_rate) AS avg_inventory_turnover_rate
                          FROM reports
                          WHERE DATE(report_date) BETWEEN ? AND ?
                          GROUP BY DATE_FORMAT(report_date, '%b %y')`;
    const metricsData = await executeQuery(metricsQuery, [startDate, endDate]);

    // Fetch revenue by product for Apex 3D Pie Chart
    const revenueByProductQuery = `SELECT report_date, revenue_by_product
                                   FROM reports
                                   WHERE DATE(report_date) BETWEEN ? AND ?`;
    const revenueByProductData = await executeQuery(revenueByProductQuery, [startDate, endDate]);

    // Decode and aggregate revenue by product data
    let revenueByProduct = {};
    revenueByProductData.forEach(report => {
      const products = JSON.parse(report.revenue_by_product);
      if (Array.isArray(products)) {
        products.forEach(product => {
          if (product.product_name && product.total_sales) {
            const productName = product.product_name;
            const totalSales = parseFloat(product.total_sales);
            revenueByProduct[productName] = (revenueByProduct[productName] || 0) + totalSales;
          }
        });
      }
    });

    // Sort and get the top 5 products
    const top5Products = Object.entries(revenueByProduct)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([productName, totalSales]) => ({ product_name: productName, total_sales: totalSales }));

    // Fetch combined revenue, total cost, and expenses data for Apex 3-Column Chart
    const revenueQuery = `SELECT DATE_FORMAT(sale_date, '%b %y') AS date, SUM(sales_qty * price) AS revenue
                          FROM sales
                          JOIN products ON sales.product_id = products.id
                          WHERE DATE(sale_date) BETWEEN ? AND ?
                          GROUP BY DATE_FORMAT(sale_date, '%b %y')`;
    const revenueData = await executeQuery(revenueQuery, [startDate, endDate]);

    const totalCostQuery = `SELECT DATE_FORMAT(sale_date, '%b %y') AS date, SUM(sales_qty * cost) AS total_cost
                            FROM sales
                            JOIN products ON sales.product_id = products.id
                            WHERE DATE(sale_date) BETWEEN ? AND ?
                            GROUP BY DATE_FORMAT(sale_date, '%b %y')`;
    const totalCostData = await executeQuery(totalCostQuery, [startDate, endDate]);

    const expenseQuery = `SELECT DATE_FORMAT(expense_date, '%b %y') AS date, SUM(amount) AS total_expenses
                          FROM expenses
                          WHERE DATE(expense_date) BETWEEN ? AND ?
                          GROUP BY DATE_FORMAT(expense_date, '%b %y')`;
    const expenseData = await executeQuery(expenseQuery, [startDate, endDate]);

    // Combine revenue, total cost, and expenses for 3-Column Chart
    const combinedData = revenueData.map(data => {
      const date = data.date;
      const revenue = parseFloat(data.revenue || 0);
      const totalCost = parseFloat(totalCostData.find(item => item.date === date)?.total_cost || 0);
      const expenses = parseFloat(expenseData.find(item => item.date === date)?.total_expenses || 0);
      const totalExpenses = totalCost + expenses;
      const profit = revenue - totalExpenses;

      return {
        date,
        revenue: revenue.toFixed(2),
        total_expenses: totalExpenses.toFixed(2),
        profit: profit.toFixed(2)
      };
    });

    // Return the data for the charts
    const response = {
      'apex-basic': salesData,
      'apex-line-area': metricsData,
      'am-3dpie-chart': top5Products,
      'apex-column': combinedData
    };

    res.json(response);
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ error: 'Database error. Please try again later.' });
  }
});

module.exports = router;

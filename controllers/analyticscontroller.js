const express = require('express');
const router = express.Router();
const dayjs = require('dayjs'); // Lightweight date library
const path = require('path'); // Path module for serving static files
const reportModel = require('./models/report'); // Import the report model

// Routes for Reports
router.post('/reports', reportController.createReport); // Create report
router.get('/reports/:report_id', reportController.getReportById); // Get report by ID
router.get('/reports', reportController.getAllReports); // Get all reports
router.put('/reports/:report_id', reportController.updateReport); // Update report
router.delete('/reports/:report_id', reportController.deleteReport); // Delete report

// Serve 'analytics.html' page
router.get('/analytics', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/analytics.html'));
});

// GET route to fetch data for charts
router.get('/chart-data', async (req, res) => {
  try {
    const range = req.query.range || 'yearly';
    let startDate, endDate;

    // Define the date range based on the selected period
    const today = dayjs();
    switch (range) {
      case 'weekly':
        startDate = today.startOf('week').format('YYYY-MM-DD');
        endDate = today.endOf('week').format('YYYY-MM-DD');
        break;
      case 'monthly':
        startDate = today.startOf('month').format('YYYY-MM-DD');
        endDate = today.endOf('month').format('YYYY-MM-DD');
        break;
      case 'yearly':
      default:
        startDate = today.startOf('year').format('YYYY-MM-DD');
        endDate = today.format('YYYY-MM-DD');
        break;
    }

    // Fetch data from the report model
    const salesData = await reportModel.getSalesData(startDate, endDate);
    const metricsData = await reportModel.getMetricsData(startDate, endDate);
    const revenueByProductData = await reportModel.getRevenueByProductData(startDate, endDate);
    const revenueData = await reportModel.getRevenueData(startDate, endDate);
    const totalCostData = await reportModel.getTotalCostData(startDate, endDate);
    const expenseData = await reportModel.getExpenseData(startDate, endDate);

    // Decode and aggregate revenue by product data
    const revenueByProduct = revenueByProductData.reduce((acc, report) => {
      const products = JSON.parse(report.revenue_by_product || '[]');
      products.forEach(product => {
        if (product.product_name && product.total_sales) {
          acc[product.product_name] = (acc[product.product_name] || 0) + parseFloat(product.total_sales);
        }
      });
      return acc;
    }, {});

    // Sort and get the top 5 products
    const top5Products = Object.entries(revenueByProduct)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([product_name, total_sales]) => ({ product_name, total_sales }));

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
        profit: profit.toFixed(2),
      };
    });

    // Return the data for the charts
    res.json({
      'apex-basic': salesData,
      'apex-line-area': metricsData,
      'am-3dpie-chart': top5Products,
      'apex-column': combinedData,
    });
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ error: 'Database error. Please try again later.' });
  }
});

module.exports = router;

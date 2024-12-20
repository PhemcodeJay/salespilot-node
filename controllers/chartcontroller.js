const reportModel = require('../models/report');
const salesModel = require('../models/sales');
const expensesModel = require('../models/expense');
const dayjs = require('dayjs');  // Correct import
const pool = require('../models/db'); // Ensure your database pool is correctly configured

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

// Get date range based on the selected period
const getDateRange = (range) => {
  let startDate, endDate;
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
  return { startDate, endDate };
};

// Fetch chart data
exports.getChartData = async (req, res) => {
  try {
    const range = req.query.range || 'yearly';
    const { startDate, endDate } = getDateRange(range);

    // Queries (same as before)
    const categoryRevenueQuery = `...`;
    const revenueProfitQuery = `...`;
    const profitQuery = `...`;
    const expensesQuery = `...`;
    const profitExpenseQuery = `...`;

    // Execute queries and send response
    const [categoryRevenueData, revenueProfitData, profitData, expensesData, profitExpenseData] = await Promise.all([ ... ]);
    const response = {
      apexLayeredColumnChart: categoryRevenueData,
      apexColumnLineChart: revenueProfitData,
      'layout1-chart-3': profitData,
      'layout1-chart-4': expensesData,
      'layout1-chart-5': profitExpenseData,
    };
    res.json(response);
  } catch (err) {
    console.error('Error fetching chart data:', err);
    res.status(500).json({ error: 'Failed to retrieve chart data' });
  }
};

// Create a report
exports.createReport = (req, res) => {
  res.send('Report Created');
};

// Get report by ID
exports.getReportById = (req, res) => {
  const { chart_id } = req.params;
  res.send(`Fetching report with ID: ${chart_id}`);
};

// Update a report
exports.updateReport = (req, res) => {
  const { chart_id } = req.params;
  res.send(`Updating report with ID: ${chart_id}`);
};

// Delete a report
exports.deleteReport = (req, res) => {
  const { chart_id } = req.params;
  res.send(`Deleting report with ID: ${chart_id}`);
};

// Get all reports (added missing function)
exports.getAllReports = (req, res) => {
  res.send('Fetching all reports');
};

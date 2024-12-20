const reportModel = require('../models/report');
const salesModel = require('../models/sales');
const expensesModel = require('../models/expense');
const dayjs = require('day');  // Correct import
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

    // Queries
    const categoryRevenueQuery = `
      SELECT categories.category_name, SUM(s.sales_qty * p.price) AS revenue
      FROM sales s
      JOIN products p ON s.product_id = p.id
      JOIN categories c ON p.category_id = c.category_id
      WHERE s.sale_date BETWEEN ? AND ?
      GROUP BY c.category_name
      ORDER BY revenue DESC
      LIMIT 5
    `;
    
    const revenueProfitQuery = `
      SELECT DATE(s.sale_date) AS date, 
             SUM(s.sales_qty * p.price) AS revenue,
             SUM(s.sales_qty * (p.price - p.cost)) AS profit
      FROM sales s
      JOIN products p ON s.product_id = p.id
      WHERE s.sale_date BETWEEN ? AND ?
      GROUP BY DATE(s.sale_date)
    `;
    
    const profitQuery = `
      SELECT DATE_FORMAT(s.sale_date, '%b %Y') AS date,
             SUM(s.sales_qty * (p.price - p.cost)) AS profit
      FROM sales s
      JOIN products p ON s.product_id = p.id
      WHERE s.sale_date BETWEEN ? AND ?
      GROUP BY DATE_FORMAT(s.sale_date, '%b %Y')
    `;
    
    const expensesQuery = `
      SELECT DATE_FORMAT(expense_date, '%b %Y') AS date,
             SUM(amount) AS expenses
      FROM expenses
      WHERE expense_date BETWEEN ? AND ?
      GROUP BY DATE_FORMAT(expense_date, '%b %Y')
    `;
    
    const profitExpenseQuery = `
      SELECT DATE_FORMAT(s.sale_date, '%b %Y') AS date,
             SUM(s.sales_qty * (p.price - p.cost)) AS profit,
             COALESCE(SUM(s.sales_qty * p.cost), 0) + 
             COALESCE(SUM(e.amount), 0) AS expenses
      FROM sales s
      JOIN products p ON s.product_id = p.id
      LEFT JOIN expenses e ON DATE(e.expense_date) = DATE(s.sale_date)
      WHERE s.sale_date BETWEEN ? AND ?
      GROUP BY DATE_FORMAT(s.sale_date, '%b %Y')
    `;

    // Execute queries and send response
    const [categoryRevenueData, revenueProfitData, profitData, expensesData, profitExpenseData] = await Promise.all([
      executeQuery(categoryRevenueQuery, [startDate, endDate]),
      executeQuery(revenueProfitQuery, [startDate, endDate]),
      executeQuery(profitQuery, [startDate, endDate]),
      executeQuery(expensesQuery, [startDate, endDate]),
      executeQuery(profitExpenseQuery, [startDate, endDate]),
    ]);

    // Combine data into the final response
    const response = {
      apexLayeredColumnChart: categoryRevenueData, // Revenue by Top 5 Categories
      apexColumnLineChart: revenueProfitData,     // Revenue vs. Profit
      'layout1-chart-3': profitData,              // Profit Only
      'layout1-chart-4': expensesData,            // Expenses Only
      'layout1-chart-5': profitExpenseData,       // Profit and Expenses Combined
    };

    // Send the JSON response
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

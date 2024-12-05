const mysql = require('mysql2');
const express = require('express');
const router = express.Router();
const moment = require('moment');
const { validationResult } = require('express-validator');

// Create a MySQL connection
const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'salespilot'
});

// Middleware to check if user is logged in
function checkUserLoggedIn(req, res, next) {
  if (!req.session.username) {
    return res.status(401).json({ error: "No username found in session." });
  }
  next();
}

// Get user information
async function getUserInfo(username) {
  try {
    const [rows] = await connection.promise().query('SELECT username, email, date FROM users WHERE username = ?', [username]);
    if (rows.length === 0) {
      throw new Error('User not found');
    }
    return rows[0];
  } catch (error) {
    throw error;
  }
}

// Fetch inventory notifications
async function getInventoryNotifications() {
  try {
    const [rows] = await connection.promise().query(`
      SELECT i.product_name, i.available_stock, i.inventory_qty, i.sales_qty, p.image_path
      FROM inventory i
      JOIN products p ON i.product_id = p.id
      WHERE i.available_stock < ? OR i.available_stock > ?
      ORDER BY i.last_updated DESC
    `, [10, 1000]);
    return rows;
  } catch (error) {
    throw error;
  }
}

// Fetch reports notifications
async function getReportsNotifications() {
  try {
    const [rows] = await connection.promise().query(`
      SELECT JSON_UNQUOTE(JSON_EXTRACT(revenue_by_product, '$.product_name')) AS product_name, 
             JSON_UNQUOTE(JSON_EXTRACT(revenue_by_product, '$.revenue')) AS revenue,
             p.image_path
      FROM reports r
      JOIN products p ON JSON_UNQUOTE(JSON_EXTRACT(revenue_by_product, '$.product_id')) = p.id
      WHERE JSON_UNQUOTE(JSON_EXTRACT(revenue_by_product, '$.revenue')) > ? 
         OR JSON_UNQUOTE(JSON_EXTRACT(revenue_by_product, '$.revenue')) < ?
      ORDER BY r.report_date DESC
    `, [10000, 1000]);
    return rows;
  } catch (error) {
    throw error;
  }
}

// Get product metrics for the period
async function getProductMetrics(startDate, endDate) {
  try {
    const [rows] = await connection.promise().query(`
      SELECT p.name, SUM(s.sales_qty) AS total_sales
      FROM sales s
      JOIN products p ON s.product_id = p.id
      WHERE DATE(s.sale_date) BETWEEN ? AND ?
      GROUP BY p.name
    `, [startDate, endDate]);
    return rows;
  } catch (error) {
    throw error;
  }
}

// Get top 5 products by revenue
async function getRevenueByProduct(startDate, endDate) {
  try {
    const [rows] = await connection.promise().query(`
      SELECT p.name, SUM(s.sales_qty * p.price) AS revenue
      FROM sales s
      JOIN products p ON s.product_id = p.id
      WHERE DATE(s.sale_date) BETWEEN ? AND ?
      GROUP BY p.name
      ORDER BY revenue DESC
      LIMIT 5
    `, [startDate, endDate]);
    return rows;
  } catch (error) {
    throw error;
  }
}

// Get inventory metrics
async function getInventoryMetrics() {
  try {
    const [rows] = await connection.promise().query(`
      SELECT p.name, i.available_stock, i.inventory_qty, i.sales_qty
      FROM inventory i
      JOIN products p ON i.product_id = p.id
    `);
    return rows;
  } catch (error) {
    throw error;
  }
}

// Get revenue and expenses for the income overview
async function getIncomeOverview(startDate, endDate) {
  try {
    const [revenueData] = await connection.promise().query(`
      SELECT DATE(s.sale_date) AS date, SUM(s.sales_qty * p.price) AS revenue
      FROM sales s
      JOIN products p ON s.product_id = p.id
      WHERE DATE(s.sale_date) BETWEEN ? AND ?
      GROUP BY DATE(s.sale_date)
    `, [startDate, endDate]);

    const [totalCostData] = await connection.promise().query(`
      SELECT DATE(sale_date) AS date, SUM(sales_qty * cost) AS total_cost
      FROM sales
      JOIN products ON sales.product_id = products.id
      WHERE DATE(sale_date) BETWEEN ? AND ?
      GROUP BY DATE(sale_date)
    `, [startDate, endDate]);

    const [expenseData] = await connection.promise().query(`
      SELECT DATE(expense_date) AS date, SUM(amount) AS total_expenses
      FROM expenses
      WHERE DATE(expense_date) BETWEEN ? AND ?
      GROUP BY DATE(expense_date)
    `, [startDate, endDate]);

    let incomeOverview = [];
    revenueData.forEach(data => {
      const date = data.date;
      const revenue = parseFloat(data.revenue) || 0;

      const totalCost = totalCostData.find(cost => cost.date === date)?.total_cost || 0;
      const expenses = expenseData.find(exp => exp.date === date)?.total_expenses || 0;

      const totalExpenses = totalCost + expenses;
      const profit = revenue - totalExpenses;

      incomeOverview.push({
        date,
        revenue: revenue.toFixed(2),
        total_expenses: totalExpenses.toFixed(2),
        profit: profit.toFixed(2)
      });
    });

    return incomeOverview;
  } catch (error) {
    throw error;
  }
}

// Define the route for handling analytics requests
router.get('/analytics', checkUserLoggedIn, async (req, res) => {
  try {
    const username = req.session.username;
    const userInfo = await getUserInfo(username);

    // Handle the range selection for weekly, monthly, or yearly data
    const range = req.query.range || 'yearly';
    let startDate = '';
    let endDate = '';
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
      default:
        startDate = moment().startOf('year').format('YYYY-MM-DD');
        endDate = moment().endOf('year').format('YYYY-MM-DD');
        break;
    }

    // Fetch all necessary data
    const inventoryNotifications = await getInventoryNotifications();
    const reportsNotifications = await getReportsNotifications();
    const productMetrics = await getProductMetrics(startDate, endDate);
    const topProducts = await getRevenueByProduct(startDate, endDate);
    const inventoryMetrics = await getInventoryMetrics();
    const incomeOverview = await getIncomeOverview(startDate, endDate);

    // Render the response with all the data
    res.json({
      user: userInfo,
      inventoryNotifications,
      reportsNotifications,
      productMetrics,
      topProducts,
      inventoryMetrics,
      incomeOverview
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

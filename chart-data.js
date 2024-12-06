const express = require('express');
const mysql = require('mysql2');
const moment = require('moment');

const app = express();
const port = 3000;

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

app.get('/getData', async (req, res) => {
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

    // Fetch sales quantity data for Apex Basic Chart with 3-letter month and 2-digit year abbreviation (e.g., Jun 24)
    const salesQuery = `
      SELECT DATE_FORMAT(sale_date, '%b %y') AS date, SUM(sales_qty) AS total_sales
      FROM sales
      WHERE DATE(sale_date) BETWEEN ? AND ?
      GROUP BY DATE_FORMAT(sale_date, '%b %y')
    `;
    const salesData = await executeQuery(salesQuery, [startDate, endDate]);

    // Fetch sell-through rate and inventory turnover rate for Apex Line Area Chart
    const metricsQuery = `
      SELECT DATE_FORMAT(report_date, '%b %y') AS date,
             AVG(sell_through_rate) AS avg_sell_through_rate,
             AVG(inventory_turnover_rate) AS avg_inventory_turnover_rate
      FROM reports
      WHERE DATE(report_date) BETWEEN ? AND ?
      GROUP BY DATE_FORMAT(report_date, '%b %y')
    `;
    const metricsData = await executeQuery(metricsQuery, [startDate, endDate]);

    // Fetch revenue by product for Apex 3D Pie Chart
    const revenueByProductQuery = `
      SELECT report_date, revenue_by_product
      FROM reports
      WHERE DATE(report_date) BETWEEN ? AND ?
    `;
    const revenueByProductData = await executeQuery(revenueByProductQuery, [startDate, endDate]);

    // Decode the revenue_by_product JSON data and aggregate it
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

    // Fetch revenue, total cost, and additional expenses for Apex 3-Column Chart
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

    // Combine revenue, total cost, and additional expenses for Apex 3-Column Chart
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

    // Prepare final data for each chart
    const response = {
      'apex-basic': salesData,
      'apex-line-area': metricsData,
      'am-3dpie-chart': top5Products,
      'apex-column': combinedData
    };

    res.json(response);
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ error: 'Failed to retrieve data.' });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

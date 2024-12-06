const mysql = require('mysql2');

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
        reject(err);
      } else {
        resolve(results);
      }
    });
  });
};

// Create a report
exports.createReport = (date, revenue_by_product) => {
  const query = 'INSERT INTO reports (report_date, revenue_by_product) VALUES (?, ?)';
  return executeQuery(query, [date, revenue_by_product]);
};

// Get a report by ID
exports.getReportById = (reports_id) => {
  const query = 'SELECT * FROM reports WHERE report_id = ?';
  return executeQuery(query, [reports_id]);
};

// Get all reports
exports.getAllReports = () => {
  const query = 'SELECT * FROM reports';
  return executeQuery(query);
};

// Update a report
exports.updateReport = (reports_id, date, revenue_by_product) => {
  const query = 'UPDATE reports SET report_date = ?, revenue_by_product = ? WHERE report_id = ?';
  return executeQuery(query, [date, revenue_by_product, reports_id]);
};

// Delete a report
exports.deleteReport = (reports_id) => {
  const query = 'DELETE FROM reports WHERE report_id = ?';
  return executeQuery(query, [reports_id]);
};

// Get sales data for charts
exports.getSalesData = (startDate, endDate) => {
  const query = `
    SELECT DATE_FORMAT(sale_date, '%b %y') AS date, SUM(sales_qty) AS total_sales
    FROM sales
    WHERE DATE(sale_date) BETWEEN ? AND ?
    GROUP BY DATE_FORMAT(sale_date, '%b %y')
  `;
  return executeQuery(query, [startDate, endDate]);
};

// Get metrics data for charts
exports.getMetricsData = (startDate, endDate) => {
  const query = `
    SELECT DATE_FORMAT(report_date, '%b %y') AS date,
           AVG(sell_through_rate) AS avg_sell_through_rate,
           AVG(inventory_turnover_rate) AS avg_inventory_turnover_rate
    FROM reports
    WHERE DATE(report_date) BETWEEN ? AND ?
    GROUP BY DATE_FORMAT(report_date, '%b %y')
  `;
  return executeQuery(query, [startDate, endDate]);
};

// Get revenue by product data for charts
exports.getRevenueByProductData = (startDate, endDate) => {
  const query = 'SELECT report_date, revenue_by_product FROM reports WHERE DATE(report_date) BETWEEN ? AND ?';
  return executeQuery(query, [startDate, endDate]);
};

// Get revenue data for charts
exports.getRevenueData = (startDate, endDate) => {
  const query = `
    SELECT DATE_FORMAT(sale_date, '%b %y') AS date, SUM(sales_qty * price) AS revenue
    FROM sales
    JOIN products ON sales.product_id = products.id
    WHERE DATE(sale_date) BETWEEN ? AND ?
    GROUP BY DATE_FORMAT(sale_date, '%b %y')
  `;
  return executeQuery(query, [startDate, endDate]);
};

// Get total cost data for charts
exports.getTotalCostData = (startDate, endDate) => {
  const query = `
    SELECT DATE_FORMAT(sale_date, '%b %y') AS date, SUM(sales_qty * cost) AS total_cost
    FROM sales
    JOIN products ON sales.product_id = products.id
    WHERE DATE(sale_date) BETWEEN ? AND ?
    GROUP BY DATE_FORMAT(sale_date, '%b %y')
  `;
  return executeQuery(query, [startDate, endDate]);
};

// Get expense data for charts
exports.getExpenseData = (startDate, endDate) => {
  const query = `
    SELECT DATE_FORMAT(expense_date, '%b %y') AS date, SUM(amount) AS total_expenses
    FROM expenses
    WHERE DATE(expense_date) BETWEEN ? AND ?
    GROUP BY DATE_FORMAT(expense_date, '%b %y')
  `;
  return executeQuery(query, [startDate, endDate]);
};

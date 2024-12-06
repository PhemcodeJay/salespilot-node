const express = require('express');
const mysql = require('mysql2');
const app = express();
const port = 3000;

// Set up the MySQL database connection
const connection = mysql.createConnection({
  host: 'localhost', // replace with your host
  user: 'root', // replace with your database username
  password: '', // replace with your database password
  database: 'dbs13455438' // replace with your database name
});

// Function to get the date range based on the selected period
function getDateRange(range) {
  let startDate = '';
  let endDate = '';

  const today = new Date();
  
  switch (range) {
    case 'weekly':
      const firstDayOfWeek = new Date(today.setDate(today.getDate() - today.getDay() + 1)); // Monday of the current week
      const lastDayOfWeek = new Date(today.setDate(firstDayOfWeek.getDate() + 6)); // Sunday of the current week
      startDate = firstDayOfWeek.toISOString().split('T')[0]; 
      endDate = lastDayOfWeek.toISOString().split('T')[0];
      break;
    case 'monthly':
      startDate = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0]; // First day of the month
      endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0]; // Last day of the month
      break;
    case 'yearly':
      startDate = `${today.getFullYear()}-01-01`; // First day of the year
      endDate = `${today.getFullYear()}-12-31`; // Last day of the year
      break;
  }

  return { startDate, endDate };
}

// Set up the API endpoint
app.get('/api/data', (req, res) => {
  const range = req.query.range || 'monthly';
  const { startDate, endDate } = getDateRange(range);

  // Query for category revenue (Top 5 categories)
  const categoryRevenueQuery = `
    SELECT categories.category_name, SUM(sales_qty * price) AS revenue
    FROM sales
    JOIN products ON sales.product_id = products.id
    JOIN categories ON products.category_id = categories.category_id
    WHERE sale_date BETWEEN ? AND ?
    GROUP BY categories.category_name
    ORDER BY revenue DESC
    LIMIT 5`;

  connection.execute(categoryRevenueQuery, [startDate, endDate], (err, categoryRevenueData) => {
    if (err) return res.status(500).json({ error: 'Database query failed' });

    // Query for revenue and profit (for combo chart)
    const revenueProfitQuery = `
      SELECT DATE(sale_date) AS date, 
             SUM(sales_qty * price) AS revenue,
             SUM(sales_qty * (price - cost)) AS profit
      FROM sales
      JOIN products ON sales.product_id = products.id
      WHERE sale_date BETWEEN ? AND ?
      GROUP BY DATE(sale_date)`;

    connection.execute(revenueProfitQuery, [startDate, endDate], (err, revenueProfitData) => {
      if (err) return res.status(500).json({ error: 'Database query failed' });

      // Query for profit only
      const profitQuery = `
        SELECT DATE_FORMAT(sale_date, '%b %Y') AS date,
               SUM(sales_qty * (price - cost)) AS profit
        FROM sales
        JOIN products ON sales.product_id = products.id
        WHERE sale_date BETWEEN ? AND ?
        GROUP BY DATE_FORMAT(sale_date, '%b %Y')`;

      connection.execute(profitQuery, [startDate, endDate], (err, profitData) => {
        if (err) return res.status(500).json({ error: 'Database query failed' });

        // Query for expenses only
        const expensesQuery = `
          SELECT DATE_FORMAT(expense_date, '%b %Y') AS date,
                 SUM(amount) AS expenses
          FROM expenses
          WHERE expense_date BETWEEN ? AND ?
          GROUP BY DATE_FORMAT(expense_date, '%b %Y')`;

        connection.execute(expensesQuery, [startDate, endDate], (err, expensesData) => {
          if (err) return res.status(500).json({ error: 'Database query failed' });

          // Query for profit and expenses combined
          const profitExpenseQuery = `
            SELECT DATE_FORMAT(s.sale_date, '%b %Y') AS date,
                   SUM(s.sales_qty * (p.price - p.cost)) AS profit,
                   COALESCE(SUM(s.sales_qty * p.cost), 0) + COALESCE(SUM(e.amount), 0) AS expenses
            FROM sales s
            JOIN products p ON s.product_id = p.id
            LEFT JOIN expenses e ON DATE(e.expense_date) = DATE(s.sale_date)
            WHERE s.sale_date BETWEEN ? AND ?
            GROUP BY DATE_FORMAT(s.sale_date, '%b %Y')`;

          connection.execute(profitExpenseQuery, [startDate, endDate], (err, profitExpenseData) => {
            if (err) return res.status(500).json({ error: 'Database query failed' });

            // Combine data into the final response
            const response = {
              apexLayeredColumnChart: categoryRevenueData, // Revenue by Top 5 Categories
              apexColumnLineChart: revenueProfitData,     // Revenue vs. Profit
              'layout1-chart-3': profitData,             // Profit Only
              'layout1-chart-4': expensesData,           // Expenses Only
              'layout1-chart-5': profitExpenseData       // Profit and Expenses Combined
            };

            // Send the JSON response
            res.json(response);
          });
        });
      });
    });
  });
});

// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

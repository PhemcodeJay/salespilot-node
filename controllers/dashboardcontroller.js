const db = require('../config/db'); // Assuming `db` is configured for your MySQL database connection
const session = require('express-session');
const dayjs = require('day'); // Day.js for date handling
const salesModel = require('../models/sales');
const inventoryModel = require('../models/inventory');
const productModel = require('../models/product');
const userModel = require('../models/user');

// Middleware to handle sessions
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

// Function to get total revenue based on range
const getRevenueQuery = (range) => {
  switch (range) {
    case 'year':
      return `
        SELECT IFNULL(SUM(s.sales_qty * p.price), 0) AS total_revenue
        FROM sales s
        JOIN products p ON s.product_id = p.id
        WHERE YEAR(s.sale_date) = YEAR(CURDATE())
      `;
    case 'week':
      return `
        SELECT IFNULL(SUM(s.sales_qty * p.price), 0) AS total_revenue
        FROM sales s
        JOIN products p ON s.product_id = p.id
        WHERE WEEK(s.sale_date) = WEEK(CURDATE()) AND YEAR(s.sale_date) = YEAR(CURDATE())
      `;
    default:
      return `
        SELECT IFNULL(SUM(s.sales_qty * p.price), 0) AS total_revenue
        FROM sales s
        JOIN products p ON s.product_id = p.id
        WHERE MONTH(s.sale_date) = MONTH(CURDATE()) AND YEAR(s.sale_date) = YEAR(CURDATE())
      `;
  }
};

// Fetch dashboard data
const getDashboardData = async (req, res) => {
  const range = req.query.range || 'month';
  const username = req.session.username || null;

  try {
    // Fetch revenue
    const revenueQuery = getRevenueQuery(range);
    const [revenueResult] = await db.query(revenueQuery);
    const totalRevenue = revenueResult[0]?.total_revenue || 0;

    // Fetch user details if logged in
    let userDetails = null;
    if (username) {
      const userQuery = `
        SELECT id, username, date, email, phone, location, is_active, role, user_image
        FROM users
        WHERE username = ?
      `;
      const [userResult] = await db.query(userQuery, [username]);
      if (userResult.length > 0) {
        const user = userResult[0];
        userDetails = {
          id: user.id,
          email: user.email,
          date: dayjs(user.date).format('DD MMMM, YYYY'), // Using Day.js for date formatting
          location: user.location,
          image: user.user_image || 'uploads/user/default.png',
          greeting: `Hi ${user.username}, Good ${getTimeOfDay()}`,
        };
      }
    }

    // Fetch top products
    const topProductsQuery = `
      SELECT p.id, p.name, p.image_path, IFNULL(SUM(s.sales_qty), 0) AS total_sold
      FROM sales s
      JOIN products p ON s.product_id = p.id
      GROUP BY p.id, p.name, p.image_path
      ORDER BY total_sold DESC
      LIMIT 5
    `;
    const [topProducts] = await db.query(topProductsQuery);

    // Fetch expenses and profits
    const expenseQuery = `
      SELECT IFNULL(SUM(amount), 0) AS total_expenses FROM expenses
    `;
    const costQuery = `
      SELECT IFNULL(SUM(s.sales_qty * p.cost), 0) AS total_cost
      FROM sales s
      JOIN products p ON s.product_id = p.id
    `;
    const [expensesResult] = await db.query(expenseQuery);
    const [costResult] = await db.query(costQuery);

    const totalExpenses = expensesResult[0]?.total_expenses || 0;
    const totalCost = costResult[0]?.total_cost || 0;
    const totalExpensesCombined = totalCost + totalExpenses;
    const totalProfit = totalRevenue - totalExpensesCombined;

    const response = {
      totalRevenue: totalRevenue.toFixed(2),
      totalCost: totalCost.toFixed(2),
      totalExpenses: totalExpenses.toFixed(2),
      totalExpensesCombined: totalExpensesCombined.toFixed(2),
      totalProfit: totalProfit.toFixed(2),
      percentageExpensesToRevenue: totalRevenue > 0 ? ((totalExpensesCombined / totalRevenue) * 100).toFixed(2) : 0,
      percentageProfitToRevenue: totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(2) : 0,
      topProducts,
      userDetails,
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
};

// Helper function for time of day
const getTimeOfDay = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Morning';
  if (hour < 18) return 'Afternoon';
  return 'Evening';
};

module.exports = {
  sessionMiddleware,
  getDashboardData,
};

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
app.get('/dashboard', (req, res) => {
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
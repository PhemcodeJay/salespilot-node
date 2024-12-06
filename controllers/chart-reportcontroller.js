const db = require('../config/db'); // Assuming `db` is configured for your MySQL database connection
const session = require('express-session');
const dayjs = require('day'); // Day.js for date handling
const salesModel = require('../models/sales');
const expensesModel = require('../models/expenses');
const productModel = require('../models/product');
const userModel = require('../models/user');
const inventoryModel = require('../models/inventory');
const reportModel = require('../models/report');

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

  <?php
session_start([
    'cookie_lifetime' => 86400,
    'cookie_secure'   => true,
    'cookie_httponly' => true,
    'use_strict_mode' => true,
    'sid_length'      => 48,
]);

include('config.php'); // Includes the updated config.php with the $connection variable

// Check if username is set in session
if (!isset($_SESSION["username"])) {
    throw new Exception("No username found in session.");
}

$username = htmlspecialchars($_SESSION["username"]);

// Retrieve user information from the users table
$user_query = "SELECT username, email, date FROM users WHERE username = :username";
$stmt = $connection->prepare($user_query);
$stmt->bindParam(':username', $username);
$stmt->execute();
$user_info = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$user_info) {
    throw new Exception("User not found.");
}

// Retrieve user email and registration date
$email = htmlspecialchars($user_info['email']);
$date = htmlspecialchars($user_info['date']);

// Retrieve the time range from the request
$range = $_GET['range'] ?? 'yearly';
$startDate = '';
$endDate = '';

// Define the date range based on the selected period
switch ($range) {
    case 'weekly':
        $startDate = date('Y-m-d', strtotime('this week Monday'));
        $endDate = date('Y-m-d', strtotime('this week Sunday'));
        break;
    case 'monthly':
        $startDate = date('Y-m-01');
        $endDate = date('Y-m-t');
        break;
    case 'yearly':
    default:
        $startDate = date('Y-01-01');
        $endDate = date('Y-12-31');
        break;
}

try {
    // Fetch product metrics for the first table (Product Name and Total Sales)
    $productMetricsQuery = $connection->prepare("
        SELECT p.name, SUM(s.sales_qty) AS total_sales 
        FROM sales s 
        JOIN products p ON s.product_id = p.id 
        WHERE DATE(s.sale_date) BETWEEN :startDate AND :endDate 
        GROUP BY p.name
    ");
    $productMetricsQuery->execute(['startDate' => $startDate, 'endDate' => $endDate]);
    $productMetrics = $productMetricsQuery->fetchAll(PDO::FETCH_ASSOC);

    // Fetch top 5 products by revenue
    $revenueByProductQuery = $connection->prepare("
        SELECT p.name, SUM(s.sales_qty * p.price) AS revenue 
        FROM sales s 
        JOIN products p ON s.product_id = p.id 
        WHERE DATE(s.sale_date) BETWEEN :startDate AND :endDate 
        GROUP BY p.name 
        ORDER BY revenue DESC 
        LIMIT 5
    ");
    $revenueByProductQuery->execute(['startDate' => $startDate, 'endDate' => $endDate]);
    $topProducts = $revenueByProductQuery->fetchAll(PDO::FETCH_ASSOC);

    // Fetch inventory metrics for the third table
    $inventoryMetricsQuery = $connection->prepare("
        SELECT p.name, i.available_stock, i.inventory_qty, i.sales_qty 
        FROM inventory i 
        JOIN products p ON i.product_id = p.id
    ");
    $inventoryMetricsQuery->execute();
    $inventoryMetrics = $inventoryMetricsQuery->fetchAll(PDO::FETCH_ASSOC);

    // Fetch income overview for the last table
    $revenueQuery = $connection->prepare("
        SELECT DATE(s.sale_date) AS date, SUM(s.sales_qty * p.price) AS revenue 
        FROM sales s 
        JOIN products p ON s.product_id = p.id 
        WHERE DATE(s.sale_date) BETWEEN :startDate AND :endDate 
        GROUP BY DATE(s.sale_date)
    ");
    $revenueQuery->execute(['startDate' => $startDate, 'endDate' => $endDate]);
    $revenueData = $revenueQuery->fetchAll(PDO::FETCH_ASSOC);

    $totalCostQuery = $connection->prepare("
        SELECT DATE(sale_date) AS date, SUM(sales_qty * cost) AS total_cost 
        FROM sales 
        JOIN products ON sales.product_id = products.id 
        WHERE DATE(sale_date) BETWEEN :startDate AND :endDate 
        GROUP BY DATE(sale_date)
    ");
    $totalCostQuery->execute(['startDate' => $startDate, 'endDate' => $endDate]);
    $totalCostData = $totalCostQuery->fetchAll(PDO::FETCH_ASSOC);

    $expenseQuery = $connection->prepare("
        SELECT DATE(expense_date) AS date, SUM(amount) AS total_expenses 
        FROM expenses 
        WHERE DATE(expense_date) BETWEEN :startDate AND :endDate 
        GROUP BY DATE(expense_date)
    ");
    $expenseQuery->execute(['startDate' => $startDate, 'endDate' => $endDate]);
    $expenseData = $expenseQuery->fetchAll(PDO::FETCH_ASSOC);

    // Combine revenue, total cost, and additional expenses for the income overview
    $incomeOverview = [];
    foreach ($revenueData as $data) {
        $date = $data['date'];
        $revenue = isset($data['revenue']) ? (float)$data['revenue'] : 0;

        $totalCost = 0;
        foreach ($totalCostData as $cost) {
            if ($cost['date'] === $date) {
                $totalCost = isset($cost['total_cost']) ? (float)$cost['total_cost'] : 0;
                break;
            }
        }

        $expenses = 0;
        foreach ($expenseData as $expense) {
            if ($expense['date'] === $date) {
                $expenses = isset($expense['total_expenses']) ? (float)$expense['total_expenses'] : 0;
                break;
            }
        }

        $totalExpenses = $totalCost + $expenses;
        $profit = $revenue - $totalExpenses;

        $incomeOverview[] = [
            'date' => $date,
            'revenue' => number_format($revenue, 2),
            'total_expenses' => number_format($totalExpenses, 2),
            'profit' => number_format($profit, 2)
        ];
    }
     
    try {
        // Prepare and execute the query to fetch user information from the users table
        $user_query = "SELECT id, username, date, email, phone, location, is_active, role, user_image FROM users WHERE username = :username";
        $stmt = $connection->prepare($user_query);
        $stmt->bindParam(':username', $username);
        $stmt->execute();
        
        // Fetch user data
        $user_info = $stmt->fetch(PDO::FETCH_ASSOC);
    
        if ($user_info) {
            // Retrieve user details and sanitize output
            $email = htmlspecialchars($user_info['email']);
            $date = date('d F, Y', strtotime($user_info['date']));
            $location = htmlspecialchars($user_info['location']);
            $user_id = htmlspecialchars($user_info['id']);
            
            // Check if a user image exists, use default if not
            $existing_image = htmlspecialchars($user_info['user_image']);
            $image_to_display = !empty($existing_image) ? $existing_image : 'uploads/user/default.png';
    
        }
    } catch (PDOException $e) {
        // Handle database errors
        exit("Database error: " . $e->getMessage());
    } catch (Exception $e) {
        // Handle user not found or other exceptions
        exit("Error: " . $e->getMessage());
    }
     
const reportModel = require('../models/report'); // Import the report model
const dayjs = require('day'); // Date library
const userModel = require('../models/user');
const salesModel = require('../models/sales');
const expensesModel = require('../models/expense');

// Create a report
exports.createReport = async (req, res) => {
  try {
    const { date, revenue_by_product } = req.body;
    const reportData = await reportModel.createReport(date, revenue_by_product);
    res.status(201).json({ message: 'Report created successfully', reportData });
  } catch (error) {
    console.error('Error creating report:', error);
    res.status(500).json({ error: 'Failed to create report' });
  }
};

// Get report by ID
exports.getReportById = async (req, res) => {
  try {
    const { reports_id } = req.params;
    const reportData = await reportModel.getReportById(reports_id);
    if (reportData) {
      res.json(reportData);
    } else {
      res.status(404).json({ error: 'Report not found' });
    }
  } catch (error) {
    console.error('Error fetching report:', error);
    res.status(500).json({ error: 'Failed to fetch report' });
  }
};

// Get all reports
exports.getAllReports = async (req, res) => {
  try {
    const reportsData = await reportModel.getAllReports();
    res.json(reportsData);
  } catch (error) {
    console.error('Error fetching reports:', error);
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
};

// Update a report
exports.updateReport = async (req, res) => {
  try {
    const { reports_id } = req.params;
    const { date, revenue_by_product } = req.body;
    const updatedReport = await reportModel.updateReport(reports_id, date, revenue_by_product);
    if (updatedReport) {
      res.json({ message: 'Report updated successfully' });
    } else {
      res.status(404).json({ error: 'Report not found' });
    }
  } catch (error) {
    console.error('Error updating report:', error);
    res.status(500).json({ error: 'Failed to update report' });
  }
};

// Delete a report
exports.deleteReport = async (req, res) => {
  try {
    const { reports_id } = req.params;
    const deletedReport = await reportModel.deleteReport(reports_id);
    if (deletedReport) {
      res.json({ message: 'Report deleted successfully' });
    } else {
      res.status(404).json({ error: 'Report not found' });
    }
  } catch (error) {
    console.error('Error deleting report:', error);
    res.status(500).json({ error: 'Failed to delete report' });
  }
};

// Chart data route
exports.getChartData = async (req, res) => {
  try {
    const range = req.query.range || 'yearly';
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
        startDate = dayjs().startOf('year').format('YYYY-MM-DD');
        endDate = dayjs().format('YYYY-MM-DD');
        break;
      default:
        startDate = dayjs().startOf('year').format('YYYY-MM-DD');
        endDate = dayjs().format('YYYY-MM-DD');
    }

    // Fetch all chart data
    const salesData = await reportModel.getSalesData(startDate, endDate);
    const metricsData = await reportModel.getMetricsData(startDate, endDate);
    const revenueByProductData = await reportModel.getRevenueByProductData(startDate, endDate);
    const revenueData = await reportModel.getRevenueData(startDate, endDate);
    const totalCostData = await reportModel.getTotalCostData(startDate, endDate);
    const expenseData = await reportModel.getExpenseData(startDate, endDate);

    // Process revenue by product data
    const revenueByProduct = revenueByProductData.reduce((acc, report) => {
      const products = JSON.parse(report.revenue_by_product || '[]');
      products.forEach(({ product_name, total_sales }) => {
        if (product_name && total_sales) {
          acc[product_name] = (acc[product_name] || 0) + parseFloat(total_sales);
        }
      });
      return acc;
    }, {});

    // Sort and get top 5 products
    const top5Products = Object.entries(revenueByProduct)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([product_name, total_sales]) => ({ product_name, total_sales }));

    // Combine revenue, total cost, and expenses for 3-Column Chart
    const combinedData = revenueData.map(({ date, revenue }) => {
      const totalCost = parseFloat(totalCostData.find((item) => item.date === date)?.total_cost || 0);
      const expenses = parseFloat(expenseData.find((item) => item.date === date)?.total_expenses || 0);
      const totalExpenses = totalCost + expenses;
      const profit = revenue - totalExpenses;

      return {
        date,
        revenue: revenue.toFixed(2),
        total_expenses: totalExpenses.toFixed(2),
        profit: profit.toFixed(2),
      };
    });

    // Send the chart data response
    res.json({
      'apex-basic': salesData,
      'apex-line-area': metricsData,
      'am-3dpie-chart': top5Products,
      'apex-column': combinedData,
    });
  } catch (err) {
    console.error('Error fetching chart data:', err);
    res.status(500).json({ error: 'Failed to retrieve chart data' });
  }
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

  
    // Query for revenue and profit (for combo chart)
    const revenueProfitQuery = `
      SELECT DATE(sale_date) AS date, 
             SUM(sales_qty * price) AS revenue,
             SUM(sales_qty * (price - cost)) AS profit
      FROM sales
      JOIN products ON sales.product_id = products.id
      WHERE sale_date BETWEEN ? AND ?
      GROUP BY DATE(sale_date)`;

    
      // Query for profit only
      const profitQuery = `
        SELECT DATE_FORMAT(sale_date, '%b %Y') AS date,
               SUM(sales_qty * (price - cost)) AS profit
        FROM sales
        JOIN products ON sales.product_id = products.id
        WHERE sale_date BETWEEN ? AND ?
        GROUP BY DATE_FORMAT(sale_date, '%b %Y')`;

      
        // Query for expenses only
        const expensesQuery = `
          SELECT DATE_FORMAT(expense_date, '%b %Y') AS date,
                 SUM(amount) AS expenses
          FROM expenses
          WHERE expense_date BETWEEN ? AND ?
          GROUP BY DATE_FORMAT(expense_date, '%b %Y')`;

     
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
    
    // Fetch sell-through rate and inventory turnover rate for Apex Line Area Chart
    const metricsQuery = `
      SELECT DATE_FORMAT(report_date, '%b %y') AS date,
             AVG(sell_through_rate) AS avg_sell_through_rate,
             AVG(inventory_turnover_rate) AS avg_inventory_turnover_rate
      FROM reports
      WHERE DATE(report_date) BETWEEN ? AND ?
      GROUP BY DATE_FORMAT(report_date, '%b %y')
    `;
   
    // Fetch revenue by product for Apex 3D Pie Chart
    const revenueByProductQuery = `
      SELECT report_date, revenue_by_product
      FROM reports
      WHERE DATE(report_date) BETWEEN ? AND ?
    `;
   
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
   
    const totalCostQuery = `
      SELECT DATE_FORMAT(sale_date, '%b %y') AS date, SUM(sales_qty * cost) AS total_cost
      FROM sales
      JOIN products ON sales.product_id = products.id
      WHERE DATE(sale_date) BETWEEN ? AND ?
      GROUP BY DATE_FORMAT(sale_date, '%b %y')
    `;
   
    const expenseQuery = `
      SELECT DATE_FORMAT(expense_date, '%b %y') AS date, SUM(amount) AS total_expenses
      FROM expenses
      WHERE DATE(expense_date) BETWEEN ? AND ?
      GROUP BY DATE_FORMAT(expense_date, '%b %y')
    `;
    
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
    const responses = {
      'apex-basic': salesData,
      'apex-line-area': metricsData,
      'am-3dpie-chart': top5Products,
      'apex-column': combinedData
    };

    res.json(response);
  

const reportModel = require('./models/report'); // Import the report model
const dayjs = require('dayjs'); // Date library

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

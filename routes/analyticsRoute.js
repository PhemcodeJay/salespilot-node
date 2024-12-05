const express = require('express');
const router = express.Router();
const moment = require('moment');
const {
  checkUserLoggedIn,
  getUserInfo,
  getInventoryNotifications,
  getReportsNotifications,
  getProductMetrics,
  getRevenueByProduct,
  getInventoryMetrics,
  getIncomeOverview
} = require('./analyticsController');


// MySQL connection setup
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
});

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

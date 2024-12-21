const mysql = require('mysql2/promise');
const { OpenAI } = require('openai');
const session = require('express-session');

// Initialize session middleware
const sessionMiddleware = session({
  secret: 'yourSecretKey', // Replace with a strong secret key
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: true, // Use 'true' if running HTTPS
    httpOnly: true,
    maxAge: 86400 * 1000, // 1 day
  }
});

// Database connection settings
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'dbs13455438'
});

// OpenAI initialization
const openAi = new OpenAI({
  apiKey: 'your_openai_api_key',
});

// Controller function to handle the analytics logic
async function generateAnalytics(req, res) {
  if (!req.session.username) {
    return res.status(401).json({ error: 'No username found in session.' });
  }

  const username = req.session.username;

  try {
    // Fetch user data from the database
    const [userRows] = await pool.execute(
      'SELECT username, email, date FROM users WHERE username = ?',
      [username]
    );

    if (userRows.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const { email, date } = userRows[0];

    // Fetch reports data
    const [reports] = await pool.execute('SELECT * FROM reports');
    const [salesAnalytics] = await pool.execute('SELECT * FROM sales_analytics');
    const [revenueData] = await pool.execute('SELECT revenue_by_product FROM reports LIMIT 1');
    const revenueByProduct = JSON.parse(revenueData[0]?.revenue_by_product || '[]');

    // Prepare sales data for AI analysis
    const salesData = {
      weekly_sales: reports,
      analytics: salesAnalytics,
      revenue_by_product: revenueByProduct,
    };

    const salesDataJson = JSON.stringify(salesData);

    // Prepare the prompt for OpenAI
    const prompt = `
    Analyze the following sales data and provide insights:
    ${salesDataJson}
    - Identify trends in sales and inventory.
    - Suggest actions to improve performance.
    - Highlight any anomalies or concerns.
    `;

    // Send the request to OpenAI for analysis
    const response = await openAi.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 1000,
    });

    const insights = response.choices[0].message.content || 'No insights found.';

    return res.status(200).json({ insights });
  } catch (error) {
    console.error('Error in analytics generation:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

// Export the session middleware and the analytics function
module.exports = {
  sessionMiddleware,
  generateAnalytics,
};

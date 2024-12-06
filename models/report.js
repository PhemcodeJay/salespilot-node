const mysql = require('mysql2');

// Create database connection pool
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'dbs13455438',
  charset: 'utf8mb4',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Promisify the pool for async/await support
const db = pool.promise();

class Reports {
  // Create the reports table if it doesn't exist
  static async createReportsTable() {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS reports (
        reports_id INT(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
        report_date DATE NOT NULL,
        revenue DECIMAL(10,2) NOT NULL,
        profit_margin DECIMAL(5,2) NOT NULL,
        revenue_by_product LONGTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(revenue_by_product)),
        year_over_year_growth DECIMAL(5,2) NOT NULL,
        cost_of_selling DECIMAL(10,2) NOT NULL,
        inventory_turnover_rate DECIMAL(5,2) NOT NULL,
        stock_to_sales_ratio DECIMAL(5,2) NOT NULL,
        sell_through_rate DECIMAL(10,2) NOT NULL,
        gross_margin_by_product DECIMAL(10,2) NOT NULL,
        net_margin_by_product DECIMAL(10,2) NOT NULL,
        gross_margin DECIMAL(10,2) NOT NULL,
        net_margin DECIMAL(10,2) NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
        last_updated TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP() ON UPDATE CURRENT_TIMESTAMP(),
        total_sales DECIMAL(10,0) NOT NULL,
        total_quantity INT(11) NOT NULL,
        total_profit DECIMAL(10,2) NOT NULL,
        total_expenses DECIMAL(10,2) NOT NULL,
        net_profit DECIMAL(10,2) NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
    `;
    try {
      await db.query(createTableQuery);
      console.log('Reports table created or already exists.');
    } catch (error) {
      console.error(`Error creating reports table: ${error.message}`);
    }
  }

  // Create a new report
  static async createReport(reportData) {
    if (!reportData.report_date || !reportData.revenue) {
      throw new Error("Required fields missing: report_date or revenue.");
    }

    const insertQuery = `
      INSERT INTO reports
      (report_date, revenue, profit_margin, revenue_by_product, year_over_year_growth, cost_of_selling,
      inventory_turnover_rate, stock_to_sales_ratio, sell_through_rate, gross_margin_by_product, 
      net_margin_by_product, gross_margin, net_margin, total_sales, total_quantity, total_profit, total_expenses, net_profit)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    try {
      const preparedData = [
        reportData.report_date,
        reportData.revenue,
        reportData.profit_margin,
        JSON.stringify(reportData.revenue_by_product),
        reportData.year_over_year_growth,
        reportData.cost_of_selling,
        reportData.inventory_turnover_rate,
        reportData.stock_to_sales_ratio,
        reportData.sell_through_rate,
        reportData.gross_margin_by_product,
        reportData.net_margin_by_product,
        reportData.gross_margin,
        reportData.net_margin,
        reportData.total_sales,
        reportData.total_quantity,
        reportData.total_profit,
        reportData.total_expenses,
        reportData.net_profit,
      ];

      const [result] = await db.query(insertQuery, preparedData);
      return { reports_id: result.insertId };
    } catch (error) {
      console.error(`Error creating report: ${error.message}`);
      throw new Error(`Error creating report: ${error.message}`);
    }
  }

  // Get a specific report by ID
  static async getReportById(reports_id) {
    const query = `SELECT * FROM reports WHERE reports_id = ?`;

    try {
      const [rows] = await db.query(query, [reports_id]);
      if (rows.length === 0) {
        throw new Error(`Report with ID ${reports_id} not found.`);
      }
      return rows[0];
    } catch (error) {
      console.error(`Error fetching report: ${error.message}`);
      throw new Error(`Error fetching report: ${error.message}`);
    }
  }

  // Get all reports with dynamic pagination and sorting
  static async getAllReports({ page = 1, limit = 10, sortBy = 'report_date', order = 'DESC' } = {}) {
    const offset = (page - 1) * limit;
    const query = `
      SELECT * FROM reports
      ORDER BY ${mysql.escapeId(sortBy)} ${mysql.escape(order)}
      LIMIT ? OFFSET ?
    `;

    try {
      const [rows] = await db.query(query, [limit, offset]);
      return rows;
    } catch (error) {
      console.error(`Error fetching all reports: ${error.message}`);
      throw new Error(`Error fetching all reports: ${error.message}`);
    }
  }

  // Update an existing report
  static async updateReport(reports_id, updatedData) {
    if (!reports_id || !updatedData) {
      throw new Error("Missing required parameters: reports_id or updatedData.");
    }

    const keys = Object.keys(updatedData);
    const values = Object.values(updatedData);

    // Add reports_id to values for the WHERE clause
    values.push(reports_id);

    const setClause = keys.map((key) => `${mysql.escapeId(key)} = ?`).join(', ');
    const updateQuery = `UPDATE reports SET ${setClause} WHERE reports_id = ?`;

    try {
      const [result] = await db.query(updateQuery, values);
      return result.affectedRows > 0;
    } catch (error) {
      console.error(`Error updating report: ${error.message}`);
      throw new Error(`Error updating report: ${error.message}`);
    }
  }

  // Delete a report
  static async deleteReport(reports_id) {
    if (!reports_id) {
      throw new Error("Missing required parameter: reports_id.");
    }

    const deleteQuery = `DELETE FROM reports WHERE reports_id = ?`;

    try {
      const [result] = await db.query(deleteQuery, [reports_id]);
      return result.affectedRows > 0;
    } catch (error) {
      console.error(`Error deleting report: ${error.message}`);
      throw new Error(`Error deleting report: ${error.message}`);
    }
  }
}

module.exports = Reports;

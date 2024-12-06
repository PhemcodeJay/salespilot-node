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
      throw new Error(`Error creating reports table: ${error.message}`);
    }
  }

  // Create a new report
  static async createReport(reportData) {
    const insertQuery = `
      INSERT INTO reports
      (report_date, revenue, profit_margin, revenue_by_product, year_over_year_growth, cost_of_selling,
      inventory_turnover_rate, stock_to_sales_ratio, sell_through_rate, gross_margin_by_product, 
      net_margin_by_product, gross_margin, net_margin, total_sales, total_quantity, total_profit, total_expenses, net_profit)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const {
      report_date, revenue, profit_margin, revenue_by_product, year_over_year_growth, cost_of_selling,
      inventory_turnover_rate, stock_to_sales_ratio, sell_through_rate, gross_margin_by_product,
      net_margin_by_product, gross_margin, net_margin, total_sales, total_quantity, total_profit, total_expenses, net_profit
    } = reportData;

    try {
      const [result] = await db.query(insertQuery, [
        report_date, revenue, profit_margin, JSON.stringify(revenue_by_product), year_over_year_growth, cost_of_selling,
        inventory_turnover_rate, stock_to_sales_ratio, sell_through_rate, gross_margin_by_product,
        net_margin_by_product, gross_margin, net_margin, total_sales, total_quantity, total_profit, total_expenses, net_profit
      ]);
      return { reports_id: result.insertId };
    } catch (error) {
      throw new Error(`Error creating report: ${error.message}`);
    }
  }

  // Get a specific report by ID
  static async getReportById(reports_id) {
    const query = `SELECT * FROM reports WHERE reports_id = ?`;

    try {
      const [rows] = await db.query(query, [reports_id]);
      if (rows.length === 0) throw new Error('Report not found.');
      return rows[0];
    } catch (error) {
      throw new Error(`Error fetching report: ${error.message}`);
    }
  }

  // Get all reports
  static async getAllReports() {
    const query = `SELECT * FROM reports ORDER BY report_date DESC`;

    try {
      const [rows] = await db.query(query);
      return rows;
    } catch (error) {
      throw new Error(`Error fetching all reports: ${error.message}`);
    }
  }

  // Update an existing report
  static async updateReport(reports_id, updatedData) {
    const {
      report_date, revenue, profit_margin, revenue_by_product, year_over_year_growth, cost_of_selling,
      inventory_turnover_rate, stock_to_sales_ratio, sell_through_rate, gross_margin_by_product,
      net_margin_by_product, gross_margin, net_margin, total_sales, total_quantity, total_profit, total_expenses, net_profit
    } = updatedData;

    const updateQuery = `
      UPDATE reports
      SET report_date = ?, revenue = ?, profit_margin = ?, revenue_by_product = ?, year_over_year_growth = ?,
          cost_of_selling = ?, inventory_turnover_rate = ?, stock_to_sales_ratio = ?, sell_through_rate = ?,
          gross_margin_by_product = ?, net_margin_by_product = ?, gross_margin = ?, net_margin = ?, total_sales = ?,
          total_quantity = ?, total_profit = ?, total_expenses = ?, net_profit = ?
      WHERE reports_id = ?
    `;

    try {
      const [result] = await db.query(updateQuery, [
        report_date, revenue, profit_margin, JSON.stringify(revenue_by_product), year_over_year_growth, cost_of_selling,
        inventory_turnover_rate, stock_to_sales_ratio, sell_through_rate, gross_margin_by_product,
        net_margin_by_product, gross_margin, net_margin, total_sales, total_quantity, total_profit, total_expenses, net_profit, reports_id
      ]);
      return result.affectedRows > 0;
    } catch (error) {
      throw new Error(`Error updating report: ${error.message}`);
    }
  }

  // Delete a report
  static async deleteReport(reports_id) {
    const deleteQuery = `DELETE FROM reports WHERE reports_id = ?`;

    try {
      const [result] = await db.query(deleteQuery, [reports_id]);
      return result.affectedRows > 0;
    } catch (error) {
      throw new Error(`Error deleting report: ${error.message}`);
    }
  }
}

module.exports = Reports;

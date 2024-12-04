
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

class SalesAnalytics {
    static async createSalesAnalyticsTable() {
      const createTableQuery = `
        CREATE TABLE IF NOT EXISTS sales_analytics (
          id INT(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
          date DATE NOT NULL,
          revenue DECIMAL(10,2) NOT NULL,
          profit_margin DECIMAL(10,2) NOT NULL,
          year_over_year_growth DECIMAL(10,2) NOT NULL,
          cost_of_selling DECIMAL(10,2) NOT NULL,
          inventory_turnover_rate DECIMAL(10,2) NOT NULL,
          stock_to_sales_ratio DECIMAL(10,2) NOT NULL,
          sell_through_rate DECIMAL(10,2) NOT NULL,
          gross_margin_by_category DECIMAL(10,2) NOT NULL,
          net_margin_by_category DECIMAL(10,2) NOT NULL,
          gross_margin DECIMAL(10,2) NOT NULL,
          net_margin DECIMAL(10,2) NOT NULL,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
          total_sales DECIMAL(10,2) NOT NULL,
          total_quantity INT(11) NOT NULL,
          total_profit DECIMAL(10,2) NOT NULL,
          total_expenses DECIMAL(10,2) NOT NULL,
          net_profit DECIMAL(10,2) NOT NULL,
          revenue_by_category DECIMAL(10,2) NOT NULL,
          most_sold_product_id INT(11) NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
      `;
      await db.query(createTableQuery);
      console.log('Sales Analytics table created or already exists.');
    }
  
    static async createSalesAnalyticsRecord(salesData) {
      const insertQuery = `
        INSERT INTO sales_analytics 
        (date, revenue, profit_margin, year_over_year_growth, cost_of_selling, inventory_turnover_rate, 
        stock_to_sales_ratio, sell_through_rate, gross_margin_by_category, net_margin_by_category, gross_margin, 
        net_margin, total_sales, total_quantity, total_profit, total_expenses, net_profit, revenue_by_category, 
        most_sold_product_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      const {
        date, revenue, profit_margin, year_over_year_growth, cost_of_selling, inventory_turnover_rate,
        stock_to_sales_ratio, sell_through_rate, gross_margin_by_category, net_margin_by_category, gross_margin, 
        net_margin, total_sales, total_quantity, total_profit, total_expenses, net_profit, revenue_by_category, 
        most_sold_product_id
      } = salesData;
  
      try {
        const [result] = await db.query(insertQuery, [
          date, revenue, profit_margin, year_over_year_growth, cost_of_selling, inventory_turnover_rate,
          stock_to_sales_ratio, sell_through_rate, gross_margin_by_category, net_margin_by_category, gross_margin, 
          net_margin, total_sales, total_quantity, total_profit, total_expenses, net_profit, revenue_by_category, 
          most_sold_product_id
        ]);
        return { id: result.insertId };
      } catch (error) {
        throw new Error(`Error creating sales analytics record: ${error.message}`);
      }
    }
  
    static async getSalesAnalyticsById(id) {
      const query = `SELECT * FROM sales_analytics WHERE id = ?`;
  
      try {
        const [rows] = await db.query(query, [id]);
        if (rows.length === 0) throw new Error('Sales Analytics record not found.');
        return rows[0];
      } catch (error) {
        throw new Error(`Error fetching sales analytics: ${error.message}`);
      }
    }
  
    static async getAllSalesAnalytics() {
      const query = `SELECT * FROM sales_analytics ORDER BY date DESC`;
  
      try {
        const [rows] = await db.query(query);
        return rows;
      } catch (error) {
        throw new Error(`Error fetching all sales analytics: ${error.message}`);
      }
    }
  
    static async updateSalesAnalytics(id, updatedData) {
      const {
        date, revenue, profit_margin, year_over_year_growth, cost_of_selling, inventory_turnover_rate,
        stock_to_sales_ratio, sell_through_rate, gross_margin_by_category, net_margin_by_category, gross_margin, 
        net_margin, total_sales, total_quantity, total_profit, total_expenses, net_profit, revenue_by_category, 
        most_sold_product_id
      } = updatedData;
  
      const updateQuery = `
        UPDATE sales_analytics
        SET date = ?, revenue = ?, profit_margin = ?, year_over_year_growth = ?, cost_of_selling = ?, 
            inventory_turnover_rate = ?, stock_to_sales_ratio = ?, sell_through_rate = ?, gross_margin_by_category = ?, 
            net_margin_by_category = ?, gross_margin = ?, net_margin = ?, total_sales = ?, total_quantity = ?, 
            total_profit = ?, total_expenses = ?, net_profit = ?, revenue_by_category = ?, most_sold_product_id = ?
        WHERE id = ?
      `;
      
      try {
        const [result] = await db.query(updateQuery, [
          date, revenue, profit_margin, year_over_year_growth, cost_of_selling, inventory_turnover_rate,
          stock_to_sales_ratio, sell_through_rate, gross_margin_by_category, net_margin_by_category, gross_margin, 
          net_margin, total_sales, total_quantity, total_profit, total_expenses, net_profit, revenue_by_category, 
          most_sold_product_id, id
        ]);
        return result.affectedRows > 0;
      } catch (error) {
        throw new Error(`Error updating sales analytics record: ${error.message}`);
      }
    }
  
    static async deleteSalesAnalytics(id) {
      const deleteQuery = `DELETE FROM sales_analytics WHERE id = ?`;
  
      try {
        const [result] = await db.query(deleteQuery, [id]);
        return result.affectedRows > 0;
      } catch (error) {
        throw new Error(`Error deleting sales analytics record: ${error.message}`);
      }
    }
  }
  
  module.exports = SalesAnalytics;
  
const db = require('./db'); // Assuming the db connection pool is defined in 'db.js'

class Inventory {
  // Method to create the inventory table
  static async createInventoryTable() {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS inventory (
        inventory_id INT(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
        product_id INT(11) NOT NULL,
        sales_qty INT(11) NOT NULL,
        last_updated TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP(),
        stock_qty INT(11) DEFAULT NULL,
        supply_qty INT(11) DEFAULT NULL,
        available_stock INT(11) GENERATED ALWAYS AS (stock_qty + supply_qty - sales_qty) STORED,
        inventory_qty INT(11) GENERATED ALWAYS AS (stock_qty + supply_qty) STORED,
        product_name VARCHAR(255) NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
    `;
    await db.query(createTableQuery);
    console.log('Inventory table created or already exists.');
  }

  // Method to create a new inventory record
  static async createInventory(inventoryData) {
    const insertInventoryQuery = `
      INSERT INTO inventory (product_id, sales_qty, stock_qty, supply_qty, product_name)
      VALUES (?, ?, ?, ?, ?)
    `;
    const { product_id, sales_qty, stock_qty, supply_qty, product_name } = inventoryData;

    try {
      const [result] = await db.query(insertInventoryQuery, [product_id, sales_qty, stock_qty, supply_qty, product_name]);
      return { inventory_id: result.insertId };
    } catch (error) {
      throw new Error(`Error creating inventory: ${error.message}`);
    }
  }

  // Method to get a specific inventory record by inventory_id
  static async getInventoryById(inventory_id) {
    const query = `SELECT * FROM inventory WHERE inventory_id = ?`;

    try {
      const [rows] = await db.query(query, [inventory_id]);
      if (rows.length === 0) throw new Error('Inventory not found.');
      return rows[0];
    } catch (error) {
      throw new Error(`Error fetching inventory: ${error.message}`);
    }
  }

  // Method to get all inventory records
  static async getAllInventory() {
    const query = `SELECT * FROM inventory ORDER BY last_updated DESC`;

    try {
      const [rows] = await db.query(query);
      return rows;
    } catch (error) {
      throw new Error(`Error fetching all inventory: ${error.message}`);
    }
  }

  // Method to update an existing inventory record
  static async updateInventory(inventory_id, updatedData) {
    const { product_id, sales_qty, stock_qty, supply_qty, product_name } = updatedData;

    const updateQuery = `
      UPDATE inventory
      SET product_id = ?, sales_qty = ?, stock_qty = ?, supply_qty = ?, product_name = ?
      WHERE inventory_id = ?
    `;
    
    try {
      const [result] = await db.query(updateQuery, [product_id, sales_qty, stock_qty, supply_qty, product_name, inventory_id]);
      return result.affectedRows > 0;
    } catch (error) {
      throw new Error(`Error updating inventory: ${error.message}`);
    }
  }

  // Method to delete an inventory record
  static async deleteInventory(inventory_id) {
    const deleteQuery = `DELETE FROM inventory WHERE inventory_id = ?`;

    try {
      const [result] = await db.query(deleteQuery, [inventory_id]);
      return result.affectedRows > 0;
    } catch (error) {
      throw new Error(`Error deleting inventory: ${error.message}`);
    }
  }
}

module.exports = Inventory;

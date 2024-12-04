class Categories {
    static async createCategoriesTable() {
      const createTableQuery = `
        CREATE TABLE IF NOT EXISTS categories (
          category_id INT(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
          category_name VARCHAR(100) NOT NULL,
          description TEXT DEFAULT NULL,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
      `;
      await db.query(createTableQuery);
      console.log('Categories table created or already exists.');
    }
  
    static async createCategory(categoryData) {
      const insertCategoryQuery = `
        INSERT INTO categories (category_name, description)
        VALUES (?, ?)
      `;
      const { category_name, description } = categoryData;
  
      try {
        const [result] = await db.query(insertCategoryQuery, [category_name, description]);
        return { category_id: result.insertId };
      } catch (error) {
        throw new Error(`Error creating category: ${error.message}`);
      }
    }
  
    static async getCategoryById(category_id) {
      const query = `SELECT * FROM categories WHERE category_id = ?`;
  
      try {
        const [rows] = await db.query(query, [category_id]);
        if (rows.length === 0) throw new Error('Category not found.');
        return rows[0];
      } catch (error) {
        throw new Error(`Error fetching category: ${error.message}`);
      }
    }
  
    static async getAllCategories() {
      const query = `SELECT * FROM categories ORDER BY created_at DESC`;
  
      try {
        const [rows] = await db.query(query);
        return rows;
      } catch (error) {
        throw new Error(`Error fetching all categories: ${error.message}`);
      }
    }
  
    static async updateCategory(category_id, updatedData) {
      const { category_name, description } = updatedData;
  
      const updateQuery = `
        UPDATE categories
        SET category_name = ?, description = ?
        WHERE category_id = ?
      `;
      
      try {
        const [result] = await db.query(updateQuery, [category_name, description, category_id]);
        return result.affectedRows > 0;
      } catch (error) {
        throw new Error(`Error updating category: ${error.message}`);
      }
    }
  
    static async deleteCategory(category_id) {
      const deleteQuery = `DELETE FROM categories WHERE category_id = ?`;
  
      try {
        const [result] = await db.query(deleteQuery, [category_id]);
        return result.affectedRows > 0;
      } catch (error) {
        throw new Error(`Error deleting category: ${error.message}`);
      }
    }
  }
  
  module.exports = Categories;
  
const { Sequelize, DataTypes } = require('sequelize');
const sequelize = new Sequelize('salespilot', 'root', '', {
    host: 'localhost',
    dialect: 'mysql',
    logging: false // Set to true if you want to see SQL queries
});

// Create database connection pool
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'your_database_name',
  charset: 'utf8mb4',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Promisify the pool for async/await usage
const db = pool.promise();


// Define Product model
const Product = sequelize.define('Product', {
    name: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            notEmpty: true,
        }
    },
    categoryId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'Categories', // Refers to the categories table
            key: 'id',
        }
    },
    category: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            notEmpty: true,
        }
    },
    productType: {
        type: DataTypes.ENUM('goods', 'services', 'digital'),
        allowNull: false,
    }
}, {
    tableName: 'products', // Name of the table in the database
    timestamps: false, // Assuming no createdAt and updatedAt columns
});

// Sync the model with the database (if the table doesn't exist)
sequelize.sync()
    .then(() => {
        console.log("Products table has been successfully created, if one doesn't exist");
    })
    .catch((error) => {
        console.error("Error syncing the product table:", error);
    });

// Export the model to use it in other parts of your app
module.exports = Product;

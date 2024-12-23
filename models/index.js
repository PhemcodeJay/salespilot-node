const User = require('./user');
const Product = require('./product');
const Category = require('./category');
const Sale = require('./sales');
const SalesAnalytics = require('./analytics');
const Inventory = require('./inventory');
const Report = require('./report');
const Customer = require('./customer');
const Expense = require('./expense');
const Invoice = require('./invoice');
const Subscription = require('./subscription');
const Payment = require('./payment');
const Supplier = require('./supplier');
const sequelize = require('../node_modules/sequelize'); // Adjust path to your Sequelize instance configuration

module.exports = {
  User,
  Product,
  Category,
  Sale,
  SalesAnalytics,
  Inventory,
  Report,
  Customer,
  Expense,
  Invoice,
  Subscription,
  Payment,
  Supplier,
  sequelize,
};

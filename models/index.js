const User = require('./user');
const Product = require('./product');
const Category = require('./category');
const Sale = require('./sales');
const SalesAnalytics = require('./analytics');
const Inventory = require('./inventory');
const Report = require('./report');
const sequelize = require('../node_modules/sequelize'); // or wherever your Sequelize instance is configured

module.exports = {
  User,
  Product,
  Category,
  Sale,
  SalesAnalytics,
  Inventory,
  Report,
  sequelize
};

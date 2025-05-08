const { Sequelize } = require("sequelize");
const env = process.env.NODE_ENV
const config = require("./config");

const sequelize = new Sequelize(config[env]);

module.exports = sequelize
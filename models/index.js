// Di dalam file: models/index.js

const sequelize = require('../config/db');
const Sequelize = require('sequelize');

const db = {};

// Impor model Anda secara manual
db.Invoice = require('./invoice.model');
db.InvoiceItem = require('./invoiceItem.model');

// Definisikan relasi di sini
db.Invoice.hasMany(db.InvoiceItem, { as: 'lineItems', foreignKey: 'invoiceId' });
db.InvoiceItem.belongsTo(db.Invoice, { foreignKey: 'invoiceId' });

// Lampirkan instance sequelize ke objek db
db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;
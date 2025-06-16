// File: models/index.js

'use strict';

const sequelize = require('../config/db'); // Mengambil instance sequelize dari config
const Sequelize = require('sequelize');

const db = {};

// Impor semua model yang telah kita definisikan
db.Invoice = require('./invoice.model.js');
db.InvoiceItem = require('./invoiceItem.model.js');
db.Stnk = require('./stnk.model.js');
db.Bpkb = require('./bpkb.model.js');

// Definisikan relasi antar model di sini
// Contoh: Satu Invoice memiliki banyak Item
db.Invoice.hasMany(db.InvoiceItem, { as: 'lineItems', foreignKey: 'invoiceId' });
db.InvoiceItem.belongsTo(db.Invoice, { foreignKey: 'invoiceId' });


// Lampirkan instance sequelize dan Sequelize ke objek db
// agar bisa diakses dari file lain jika diperlukan
db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;
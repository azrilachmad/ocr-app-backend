// File: models/index.js
'use strict';
const sequelize = require('../config/db');
const Sequelize = require('sequelize');

const db = {};

// 1. Impor SEMUA model Anda terlebih dahulu
db.Invoice = require('./invoice.model.js');
db.InvoiceItem = require('./invoiceItem.model.js');
db.Stnk = require('./stnk.model.js');
db.Bpkb = require('./bpkb.model.js');
db.UploadedFile = require('./uploadedFile.model.js'); // <-- Pastikan ini ada

// 2. Definisikan SEMUA relasi setelah semua model diimpor
// Relasi Invoice -> InvoiceItem
db.Invoice.hasMany(db.InvoiceItem, { as: 'lineItems', foreignKey: 'invoiceId', onDelete: 'CASCADE' });
db.InvoiceItem.belongsTo(db.Invoice, { foreignKey: 'invoiceId' });

// Relasi Polymorphic untuk File
const documentModels = [db.Invoice, db.Stnk, db.Bpkb];
documentModels.forEach(model => {
    model.hasOne(db.UploadedFile, {
        foreignKey: 'documentId',
        constraints: false,
        scope: {
            documentType: model.name.toLowerCase() // 'invoice', 'stnk', atau 'bpkb'
        }
    });
    db.UploadedFile.belongsTo(model, { foreignKey: 'documentId', constraints: false });
});

// 3. Ekspor semua yang diperlukan
db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;
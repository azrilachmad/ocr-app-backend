// Di dalam file: model/invoiceItem.model.js

const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const InvoiceItem = sequelize.define('InvoiceItem', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    // Foreign Key untuk menghubungkan ke Invoice
    invoiceId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'invoice_id',
        references: {
            model: 'invoices', // Nama tabel invoices
            key: 'id'
        }
    },
    description: { type: DataTypes.STRING, allowNull: false },
    quantity: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    unit: { type: DataTypes.STRING },
    unitPrice: { type: DataTypes.DECIMAL(15, 2), allowNull: false, field: 'unit_price' },
    discountPercentage: { type: DataTypes.DECIMAL(5, 2), field: 'discount_percentage' },
    discountAmount: { type: DataTypes.DECIMAL(15, 2), field: 'discount_amount' },
    totalPrice: { type: DataTypes.DECIMAL(15, 2), allowNull: false, field: 'total_price' },
    batchNumber: { type: DataTypes.STRING, field: 'batch_number' },
    expiryDate: { type: DataTypes.DATEONLY, field: 'expiry_date' }
}, {
    tableName: 'invoice_items',
    timestamps: false // Umumnya item baris tidak butuh timestamp
});

module.exports = InvoiceItem;
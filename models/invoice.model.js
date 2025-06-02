// Di dalam file: model/invoice.model.js

const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Invoice = sequelize.define('Invoice', {
    // Kunci Utama
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    
    // --- Dari 'informasi_umum' ---
    invoiceType: {
        type: DataTypes.ENUM('pembelian', 'penjualan', 'tidak_diketahui'),
        defaultValue: 'tidak_diketahui',
        allowNull: false,
        field: 'invoice_type',
        comment: 'Membedakan invoice masuk (pembelian) dan keluar (penjualan)'
    },
    documentTitle: {
        type: DataTypes.STRING,
        field: 'document_title'
    },
    documentNumber: {
        type: DataTypes.STRING,
        field: 'document_number'
    },
    taxInvoiceNumber: {
        type: DataTypes.STRING,
        field: 'tax_invoice_number'
    },
    purchaseOrderNumber: {
        type: DataTypes.STRING,
        field: 'purchase_order_number'
    },
    salesOrderNumber: {
        type: DataTypes.STRING,
        field: 'sales_order_number'
    },
    issueDate: {
        type: DataTypes.DATEONLY,
        field: 'issue_date'
    },
    dueDate: {
        type: DataTypes.DATEONLY,
        field: 'due_date'
    },
    salespersonName: {
        type: DataTypes.STRING,
        field: 'salesperson_name'
    },

    // --- Dari 'pihak_terlibat' ---
    vendorName: { type: DataTypes.STRING, field: 'vendor_name' },
    vendorAddress: { type: DataTypes.TEXT, field: 'vendor_address' },
    vendorPhone: { type: DataTypes.STRING, field: 'vendor_phone' },
    vendorNpwp: { type: DataTypes.STRING, field: 'vendor_npwp' },
    customerName: { type: DataTypes.STRING, field: 'customer_name' },
    customerBillingAddress: { type: DataTypes.TEXT, field: 'customer_billing_address' },
    customerShippingAddress: { type: DataTypes.TEXT, field: 'customer_shipping_address' },
    customerPhone: { type: DataTypes.STRING, field: 'customer_phone' },
    customerNpwp: { type: DataTypes.STRING, field: 'customer_npwp' },
    
    // --- Dari 'rekapitulasi_finansial' ---
    subtotal: { type: DataTypes.DECIMAL(15, 2) },
    globalDiscountAmount: { type: DataTypes.DECIMAL(15, 2), field: 'global_discount_amount' },
    taxableAmountDpp: { type: DataTypes.DECIMAL(15, 2), field: 'taxable_amount_dpp' },
    vatAmount: { type: DataTypes.DECIMAL(15, 2), field: 'vat_amount' },
    shippingCost: { type: DataTypes.DECIMAL(15, 2), field: 'shipping_cost' },
    stampDutyFee: { type: DataTypes.DECIMAL(15, 2), field: 'stamp_duty_fee' },
    grandTotal: { type: DataTypes.DECIMAL(15, 2), field: 'grand_total' },
    currency: { type: DataTypes.STRING(10) },
    amountInWords: { type: DataTypes.TEXT, field: 'amount_in_words' },
    
    // --- Dari 'detail_pembayaran' ---
    paymentMethod: { type: DataTypes.STRING, field: 'payment_method' },
    paymentBankName: { type: DataTypes.STRING, field: 'payment_bank_name' },
    paymentAccountNumber: { type: DataTypes.STRING, field: 'payment_account_number' },
    paymentAccountName: { type: DataTypes.STRING, field: 'payment_account_name' },
    
    // --- Dari 'informasi_legal_otorisasi' ---
    signerName: { type: DataTypes.STRING, field: 'signer_name' },
    signerPosition: { type: DataTypes.STRING, field: 'signer_position' },
    sipaNumber: { type: DataTypes.STRING, field: 'sipa_number' },
    sikNumber: { type: DataTypes.STRING, field: 'sik_number' },
    notes: { type: DataTypes.TEXT },
    
    // Data mentah untuk referensi
    rawOcrText: {
        type: DataTypes.TEXT('long'),
        field: 'raw_ocr_text'
    }

}, {
    tableName: 'invoices',
    underscored: true, // Otomatis menggunakan snake_case untuk nama kolom (e.g., createdAt -> created_at)
    timestamps: true // Otomatis membuat kolom createdAt dan updatedAt
});

module.exports = Invoice;
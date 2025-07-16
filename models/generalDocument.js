// models/generalDocument.model.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const GeneralDocument = sequelize.define('GeneralDocument', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    // Sesuai dengan "ringkasan" dari JSON
    summary: {
        type: DataTypes.TEXT,
        comment: 'Ringkasan dokumen yang dihasilkan oleh AI.'
    },
    // Sesuai dengan "poin_kunci" dari JSON. Menyimpan array.
    keyPoints: {
        type: DataTypes.JSON,
    },
    // Sesuai dengan "insight_potensial" dari JSON
    potentialInsights: {
        type: DataTypes.TEXT,
    },
    // Sesuai dengan "kemungkinan_penulis" dari JSON
    possibleAuthor: {
        type: DataTypes.STRING,
    },
    // Sesuai dengan "kemungkinan_tanggal_terbit" dari JSON
    possiblePublishDate: {
        type: DataTypes.DATEONLY,
    },
    // Sesuai dengan "possible_document_type" dari JSON
    possibleDocumentType: {
        type: DataTypes.STRING,
    },
    tanggal_diproses: { type: DataTypes.DATEONLY, field: 'tanggal_diproses' },
    // Tetap simpan teks mentah untuk referensi
    rawOcrText: {
        type: DataTypes.TEXT('long'),
    }
}, {
    tableName: 'general_documents', // Nama tabel di database
    timestamps: true,
    underscored: true // Ini akan membuat kolom di DB menjadi snake_case (contoh: key_points)
});

module.exports = GeneralDocument;
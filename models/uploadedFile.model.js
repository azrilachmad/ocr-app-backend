// File: models/uploadedFile.model.js
'use strict';
const { DataTypes } = require('sequelize');
const sequelize = require('../config/db'); // Pastikan path ini benar

const UploadedFile = sequelize.define('UploadedFile', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    userDefinedFilename: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    originalFilename: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    mimeType: {
        type: DataTypes.STRING,
    },
    fileData: {
        type: DataTypes.BLOB('long'),
        allowNull: false,
    },
    // Kolom untuk polymorphic association
    documentId: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    documentType: {
        type: DataTypes.STRING,
        allowNull: false,
    }
}, {
    tableName: 'uploaded_files',
    underscored: true,
    timestamps: true
});

module.exports = UploadedFile;
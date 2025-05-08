const { Sequelize, DataTypes } = require("sequelize");
const db = require("./../config/db.js");
require('dotenv').config()


const vehicleSales = db.define('vehicleSales', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    tgl: {
        type: DataTypes.STRING,
    },
    lokasi_unit: {
        type: DataTypes.STRING,
        underscored: true,
    },
    asset_description: {
        type: DataTypes.STRING,
        underscored: true,
    },
    year2: {
        type: DataTypes.STRING,
    },
    warna: {
        type: DataTypes.STRING,
    },
    nopol: {
        type: DataTypes.STRING,
    },
    umur: {
        type: DataTypes.INTEGER,
    },
    pajak: {
        type: DataTypes.STRING,
    },
    stnk: {
        type: DataTypes.STRING,
    },
    grade: {
        type: DataTypes.STRING,
    },
    note: {
        type: DataTypes.TEXT,
    },
    km: {
        type: DataTypes.TEXT,
    },
    bottom_price: {
        type: DataTypes.STRING,
        underscored: true,
    },
    buy_now: {
        type: DataTypes.STRING,
        underscored: true,
    },
    status: {
        type: DataTypes.STRING,
    },
    selling: {
        type: DataTypes.STRING,
    },
    buyer: {
        type: DataTypes.STRING,
    },
    channel: {
        type: DataTypes.STRING,
    },
    user_id: {
        type: DataTypes.STRING,
        underscored: true,
    },
    fee_admin: {
        type: DataTypes.STRING,
        underscored: true,
    },
    total_va: {
        type: DataTypes.STRING,
        underscored: true,
    },
    pic: {
        type: DataTypes.STRING,
    },
    region_warehouse: {
        type: DataTypes.STRING,
        underscored: true,
    },
    provinsi_mitra: {
        type: DataTypes.STRING,
        underscored: true,
    },
    final_status: {
        type: DataTypes.STRING,
        underscored: true,
    },
    va_bayar: {
        type: DataTypes.STRING,
        underscored: true,
    },
    provinsi_lokasi_unit: {
        type: DataTypes.STRING,
        underscored: true,
    },
    kota: {
        type: DataTypes.STRING,
    },
    regional_mitra: {
        type: DataTypes.STRING,
        underscored: true,
    },
    inv_amount: {
        type: DataTypes.STRING,
        underscored: true,
    },
    harga_mp: {
        type: DataTypes.STRING,
        underscored: true,
    },
    vehicle_brand: {
        type: DataTypes.STRING,
        underscored: true,
    },
    vehicle_transmission: {
        type: DataTypes.STRING,
        underscored: true,
    },
    vehicle_cc: {
        type: DataTypes.FLOAT,
        underscored: true,
    },
    vehicle_type: {
        type: DataTypes.STRING,
        underscored: true,
    },
    vehicle_model: {
        type: DataTypes.STRING,
        underscored: true,
    },
    nama_mobil: {
        type: DataTypes.STRING,
        underscored: true,
    },
}, {
    tableName: 'vehicle_sales',
    timestamps: true,
    updatedAt: 'updated_at',
    createdAt: 'created_at',
    // freezeTableName: true
});

module.exports = vehicleSales;
(async () => {
    await db.sync();
})();

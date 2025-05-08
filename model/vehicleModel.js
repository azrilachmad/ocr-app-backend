const { Sequelize, DataTypes } = require("sequelize");
const db = require("./../config/db.js");
require('dotenv').config()


const Cars = db.define('Cars', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    agreement_no: {
        type: DataTypes.INTEGER,
        underscored: true,
    },
    asset_desc: {
        type: DataTypes.STRING,
        underscored: true,
    },
    ai_nama_mobil: {
        type: DataTypes.STRING,
        underscored: true,
    },
    tahun: {
        type: DataTypes.INTEGER,
    },
    nopol: {
        type: DataTypes.STRING,
    },
    umur: {
        type: DataTypes.INTEGER,
    },
    noka: {
        type: DataTypes.STRING,
    },
    nosin: {
        type: DataTypes.STRING,
    },
    warna: {
        type: DataTypes.STRING,
    },
    lokasi_unit: {
        type: DataTypes.STRING,
        underscored: true,
    },
    kota: {
        type: DataTypes.STRING,
    },
    provinsi: {
        type: DataTypes.STRING,
    },
    receive_date: {
        type: DataTypes.DATE,
        underscored: true,
    },
    inspection_date: {
        type: DataTypes.DATE,
        underscored: true,
    },
    approval_date: {
        type: DataTypes.DATE,
        underscored: true,
    },
    qc_date: {
        type: DataTypes.DATE,
        underscored: true,
    },
    grade_interior: {
        type: DataTypes.STRING,
        underscored: true,
    },
    grade_body: {
        type: DataTypes.STRING,
        underscored: true,
    },
    grade_mesin: {
        type: DataTypes.STRING,
        underscored: true,
    },
    overall_grade: {
        type: DataTypes.STRING,
        underscored: true,
    },
    masa_berlaku_pajak: {
        type: DataTypes.DATE,
        underscored: true,
    },
    masa_berlaku_stnk: {
        type: DataTypes.DATE,
        underscored: true,
    },
    final_status: {
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
        type: DataTypes.INTEGER,
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
    harga_history_date: {
        type: DataTypes.STRING,
        underscored: true,
    },
    ai_harga_history: {
        type: DataTypes.INTEGER,
        underscored: true,
    },
    ai_harga_atas: {
        type: DataTypes.INTEGER,
        underscored: true,
    },
    ai_harga_bawah: {
        type: DataTypes.INTEGER,
        underscored: true,
    },
    hit_count: {
        type: DataTypes.INTEGER,
        underscored: true,
    },
    checked_date: {
        type: DataTypes.DATE,
        underscored: true,
    },
}, {
    tableName: 'vehicle_price_check_ai',
    timestamps: true,
    updatedAt: 'updated_at',
    createdAt: 'created_at',
    // freezeTableName: true
});

module.exports = Cars;
(async () => {
    await db.sync();
})();

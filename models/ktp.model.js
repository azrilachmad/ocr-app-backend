const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Ktp = sequelize.define('Ktp', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    nama: {
        type: DataTypes.STRING,
    },
    nik: {
        type: DataTypes.STRING,
    },
    nama: {
        type: DataTypes.STRING,
    },
    tempat_tgl_lahir: {
        type: DataTypes.STRING,
    },
    jenis_kelamin: {
        type: DataTypes.STRING,
    },
    gol_darah: {
        type: DataTypes.STRING,
    },
    alamat: {
        type: DataTypes.STRING,
    },
    rt: {
        type: DataTypes.STRING,
    },
    rw: {
        type: DataTypes.STRING,
    },
    kel_desa: {
        type: DataTypes.STRING,
    },
    kecamatan: {
        type: DataTypes.STRING,
    },
    agama: {
        type: DataTypes.STRING,
    },
    status_perkawinan: {
        type: DataTypes.STRING,
    },
    kewarganegaraan: {
        type: DataTypes.STRING,
    },
    berlaku_hingga: {
        type: DataTypes.STRING,
    },
    provinsi: {
        type: DataTypes.STRING,
    },
    kabupaten_kota: {
        type: DataTypes.STRING,
    },
    tanggal_dibuat: {
        type: DataTypes.STRING,
    },
    tanggal_diproses: { type: DataTypes.DATEONLY, field: 'tanggal_diproses' },
    rawOcrText: {
        type: DataTypes.TEXT('long'),
    }
}, {
    tableName: 'ktp', // Nama tabel di database
    timestamps: true,
    underscored: true // Ini akan membuat kolom di DB menjadi snake_case (contoh: key_points)
});

module.exports = Ktp;
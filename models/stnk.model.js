// models/stnk.model.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Stnk = sequelize.define('Stnk', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    no: { type: DataTypes.STRING, field: 'no' },
    nomorRegistrasi: { type: DataTypes.STRING, field: 'nomor_registrasi' },
    namaPemilik: { type: DataTypes.STRING, field: 'nama_pemilik' },
    alamat: { type: DataTypes.TEXT },
    merk: { type: DataTypes.STRING },
    tipe: { type: DataTypes.STRING },
    jenis: { type: DataTypes.STRING },
    model: { type: DataTypes.STRING },
    tahunPembuatan: { type: DataTypes.STRING, field: 'tahun_pembuatan' },
    isiSilinder: { type: DataTypes.STRING, field: 'isi_silinder' },
    nomorRangka: { type: DataTypes.STRING, field: 'nomor_rangka' },
    nomorMesin: { type: DataTypes.STRING, field: 'nomor_mesin' },
    nik: { type: DataTypes.STRING, field: 'nik' },
    warna: { type: DataTypes.STRING, field: 'warna' },
    bahanBakar: { type: DataTypes.STRING, field: 'bahan_bakar' },
    warnaTnkb: { type: DataTypes.STRING, field: 'warna_tnkb' },
    tahunRegistrasi: { type: DataTypes.STRING, field: 'tahun_registrasi' },
    nomorBpkb: { type: DataTypes.STRING, field: 'nomor_bpkb' },
    noUrutPendaftaran: { type: DataTypes.STRING, field: 'no_urut_pendaftaran' },
    kodeLokasi: { type: DataTypes.STRING, field: 'kode_lokasi' },
    berlakuSampai: { type: DataTypes.DATEONLY, field: 'berlaku_sampai' },
    rawOcrText: { type: DataTypes.TEXT('long'), field: 'raw_ocr_text' }
}, {
    tableName: 'stnks',
    underscored: true,
    timestamps: true
});

module.exports = Stnk;
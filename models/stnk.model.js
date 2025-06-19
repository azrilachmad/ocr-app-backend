// models/stnk.model.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Stnk = sequelize.define('Stnk', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    no: { type: DataTypes.STRING, field: 'no' },
    nomorRegistrasi: { type: DataTypes.STRING, field: 'nomor_registrasi' },
    namaPemilik: { type: DataTypes.STRING, field: 'nama_pemilik' },
    alamat: { type: DataTypes.TEXT, field: 'alamat' },
    merk: { type: DataTypes.TEXT, field: 'merk' },
    tipe: { type: DataTypes.STRING, field: 'tipe' },
    jenis: { type: DataTypes.STRING, field: 'jenis' },
    model: { type: DataTypes.STRING, field: 'model' },
    tahunPembuatan: { type: DataTypes.STRING, field: 'tahun_pembuatan' },
    isiSilinderDayaListrik: { type: DataTypes.STRING, field: 'isi_silinder_daya_listrik' },
    nomorRangka: { type: DataTypes.STRING, field: 'nomor_rangka' },
    nomorMesin: { type: DataTypes.STRING, field: 'nomor_mesin' },
    nik: { type: DataTypes.STRING, field: 'nik' },
    warna: { type: DataTypes.STRING, field: 'warna' },
    bahanBakar: { type: DataTypes.STRING, field: 'bahan_bakar' },
    warnaTnkb: { type: DataTypes.STRING, field: 'warna_tnkb' },
    tahunRegistrasi: { type: DataTypes.STRING, field: 'tahun_registrasi' },
    nomorBpkb: { type: DataTypes.STRING, field: 'nomor_bpkb' },
    nomorUrutPendaftaran: { type: DataTypes.STRING, field: 'nomor_urut_pendaftaran' },
    kodeLokasi: { type: DataTypes.STRING, field: 'kode_lokasi' },
    berlakuSampai: { type: DataTypes.STRING, field: 'berlaku_sampai' },
    rawOcrText: { type: DataTypes.TEXT, field: 'raw_ocr_text' } // Menyimpan teks OCR mentah
}, {
    tableName: 'stnks',
    underscored: true,
    timestamps: true
});

module.exports = Stnk;
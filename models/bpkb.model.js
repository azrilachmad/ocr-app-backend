// models/bpkb.model.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Bpkb = sequelize.define('Bpkb', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    nomorBpkb: { type: DataTypes.STRING, field: 'no' },
    namaPemilik: { type: DataTypes.STRING, field: 'nama_pemilik' },
    pekerjaan: { type: DataTypes.STRING, field: 'pekerjaan' },
    alamat: { type: DataTypes.TEXT, field: 'alamat' },
    nomorKtp: { type: DataTypes.STRING, field: 'nomor_ktp' },
    lokasiDikeluarkan: { type: DataTypes.STRING, field: 'lokasi_dikeluarkan' },
    tanggalDikeluarkan: { type: DataTypes.DATEONLY, field: 'tanggal_dikeluarkan' },
    nomorRegistrasi: { type: DataTypes.STRING, field: 'nomor_registrasi' },
    merk: { type: DataTypes.STRING, field: 'merk' },
    tipe: { type: DataTypes.STRING, field: 'tipe' },
    jenis: { type: DataTypes.STRING, field: 'jenis' },
    model: { type: DataTypes.STRING, field: 'model' },
    tahunPembuatan: { type: DataTypes.STRING, field: 'tahun_pembuatan' },
    isiSilinder: { type: DataTypes.STRING, field: 'isi_silinder' },
    warna: { type: DataTypes.STRING, field: 'warna' },
    nomorRangka: { type: DataTypes.STRING, field: 'nomor_rangka' },
    nomorMesin: { type: DataTypes.STRING, field: 'nomor_mesin' },
    bahanBakar: { type: DataTypes.STRING, field: 'bahan_bakar' },
    jumlahSumbu: { type: DataTypes.STRING, field: 'jumlah_sumbu' },
    jumlahRoda: { type: DataTypes.STRING, field: 'jumlah_roda' },
    noSertifikatUjiTipe: { type: DataTypes.STRING, field: 'no_sertifikat_uji_tipe' },
    jenisKendaraanKategori: { type: DataTypes.STRING, field: 'jenis_kendaraan_kategori' },
    nomorFaktur: { type: DataTypes.STRING, field: 'nomor_faktur' },
    tanggal: { type: DataTypes.DATEONLY, field: 'tanggal' },
    atpmImportir: { type: DataTypes.STRING, field: 'atpm_importir' },
    nomorPib: { type: DataTypes.STRING, field: 'nomor_pib' },
    nomorSut: { type: DataTypes.STRING, field: 'nomor_sut' },
    nomorTpt: { type: DataTypes.STRING, field: 'nomor_tpt' },
    noFormAbc: { type: DataTypes.STRING, field: 'no_form_abc' },
    kantorBeaCukai: { type: DataTypes.STRING, field: 'kantor_bea_cukai' },
    noRisalahLelang: { type: DataTypes.STRING, field: 'no_risalah_lelang' },
    noSkepDum: { type: DataTypes.STRING, field: 'no_skep_dum' },
    perubahan: { type: DataTypes.STRING, field: 'perubahan' },
    jenisPerubahan: { type: DataTypes.STRING, field: 'jenis_perubahan' },
    lokasiPerubahanDikeluarkan: { type: DataTypes.STRING, field: 'lokasi_perubahan_dikeluarkan' },
    tanggalPerubahanDikeluarkan: { type: DataTypes.DATEONLY, field: 'tanggal_perubahan_dikeluarkan' },
    // Data mentah untuk referensi
    rawOcrText: {
        type: DataTypes.TEXT('long'),
        field: 'raw_ocr_text'
    }
}, {
    tableName: 'bpkbs',
    underscored: true,
    timestamps: true
});

module.exports = Bpkb;
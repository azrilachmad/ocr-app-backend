// Di dalam file: controllers/invoiceController.js

const fs = require('fs').promises;
const { Op } = require('sequelize'); // Impor Operator Sequelize untuk pencarian
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const { extractTextWithVisionAI } = require('../utils/googleVisionService');
const { extractDetailsWithGemini, identifyDocumentType, getInsightsFromDocument } = require('../utils/geminiAiStudioService');


const { Invoice, InvoiceItem, Stnk, Bpkb, UploadedFile, GeneralDocument, Ktp, sequelize } = require('../models'); // Pastikan path ini benar
const { convDate } = require('../helper');
const { raw } = require('body-parser');


exports.processOcrOnly = catchAsync(async (req, res, next) => {
    if (!req.files || req.files.length === 0) {
        return next(new AppError("Tidak ada file yang diunggah.", 400));
    }

    const filePaths = req.files.map(file => file.path);
    let combinedOcrText = "";

    try {
        // 1. Jalankan OCR pada semua file dan gabungkan teksnya
        console.log(`Memproses ${req.files.length} file...`);
        const ocrPromises = req.files.map(file => extractTextWithVisionAI(file.path, file.mimetype));
        const ocrResults = await Promise.all(ocrPromises);
        combinedOcrText = ocrResults.join('\n\n--- HALAMAN BERIKUTNYA ---\n\n');

        if (!combinedOcrText) {
            throw new AppError("Vision AI tidak dapat mengekstrak teks dari dokumen.", 400);
        }

        // 2. Identifikasi tipe dokumen
        const documentType = await identifyDocumentType(combinedOcrText);
        console.log(`Dokumen teridentifikasi sebagai: ${documentType}`);

        let responseData;

        // 3. Logika Kondisional: Ekstrak data terstruktur atau dapatkan insight
        if (['INVOICE', 'STNK', 'BPKB', 'KTP'].includes(documentType)) {
            // JALUR A: Dokumen dikenali
            const extractedData = await extractDetailsWithGemini(combinedOcrText, documentType);
            responseData = {
                document_type: documentType,
                content: extractedData
            };
        } else {
            // JALUR B: Dokumen tidak dikenali
            const insights = await getInsightsFromDocument(combinedOcrText);
            responseData = {
                document_type: 'DOKUMEN_UMUM',
                content: insights
            };
        }

        // Selalu sertakan teks mentah dalam konten untuk referensi
        responseData.content.raw_ocr_text = combinedOcrText;

        // 4. Sajikan hasil ke frontend
        res.status(200).json({
            status: 'success',
            message: 'Dokumen berhasil diproses.',
            data: responseData
        });

    } finally {
        // Hapus semua file temporary
        for (const filePath of filePaths) {
            await fs.unlink(filePath).catch(console.error);
        }
    }
});

/**
 * Controller terpadu untuk MENYIMPAN semua jenis dokumen ke tabel yang sesuai.
 */
exports.submitData = catchAsync(async (req, res, next) => {
    // Data dari frontend memiliki struktur: { document_type, content }
    const { document_type, userDefinedFilename, content } = req.body;
    const files = req.files; // Ini sekarang sebuah array

    const parsedData = JSON.parse(content); // Pastikan content adalah string JSON

    // 2. Validasi input
    if (!document_type || !content || !userDefinedFilename) {
        return next(new AppError('Data tidak lengkap. Harap sertakan tipe, konten, dan nama file.', 400));
    }
    if (!files) {
        return next(new AppError('File dokumen asli tidak disertakan dalam permintaan.', 400));
    }

    let result;
    const transaction = await sequelize.transaction();
    const filePaths = files.map(f => f.path); // Kumpulkan path untuk dibersihkan nanti
    try {
        switch (document_type) {
            case 'INVOICE':
                result = await sequelize.transaction(async (t) => {
                    const newInvoice = await Invoice.create({
                        invoiceType: parsedData.content.informasi_umum?.tipe_dokumen?.toLowerCase().includes('pembelian') ? 'pembelian' : 'penjualan',
                        documentTitle: parsedData.content.informasi_umum?.judul_dokumen,
                        documentNumber: parsedData.content.informasi_umum?.nomor_dokumen,
                        taxInvoiceNumber: parsedData.content.informasi_umum?.nomor_faktur_pajak,
                        purchaseOrderNumber: parsedData.content.informasi_umum?.nomor_purchase_order,
                        salesOrderNumber: parsedData.content.informasi_umum?.nomor_sales_order,
                        issueDate: convDate(parsedData.content.informasi_umum?.tanggal_terbit),
                        dueDate: convDate(parsedData.content.informasi_umum?.tanggal_jatuh_tempo),
                        salespersonName: parsedData.content.informasi_umum?.nama_salesman,
                        vendorName: parsedData.content.pihak_terlibat?.vendor?.nama,
                        vendorAddress: parsedData.content.pihak_terlibat?.vendor?.alamat,
                        vendorPhone: parsedData.content.pihak_terlibat?.vendor?.telepon,
                        vendorNpwp: parsedData.content.pihak_terlibat?.vendor?.npwp,
                        customerName: parsedData.content.pihak_terlibat?.pelanggan?.nama,
                        customerBillingAddress: parsedData.content.pihak_terlibat?.pelanggan?.alamat_penagihan,
                        customerShippingAddress: parsedData.content.pihak_terlibat?.pelanggan?.alamat_pengiriman,
                        customerPhone: parsedData.content.pihak_terlibat?.pelanggan?.telepon,
                        customerNpwp: parsedData.content.pihak_terlibat?.pelanggan?.npwp,
                        subtotal: parsedData.content.rekapitulasi_finansial?.subtotal,
                        globalDiscountAmount: parsedData.content.rekapitulasi_finansial?.total_diskon_global_jumlah,
                        taxableAmountDpp: parsedData.content.rekapitulasi_finansial?.dasar_pengenaan_pajak_dpp,
                        vatAmount: parsedData.content.rekapitulasi_finansial?.pajak_ppn_jumlah,
                        shippingCost: parsedData.content.rekapitulasi_finansial?.ongkos_kirim,
                        stampDutyFee: parsedData.content.rekapitulasi_finansial?.biaya_meterai,
                        grandTotal: parsedData.content.rekapitulasi_finansial?.total_tagihan_akhir,
                        currency: parsedData.content.rekapitulasi_finansial?.mata_uang,
                        amountInWords: parsedData.content.rekapitulasi_finansial?.terbilang,
                        paymentMethod: parsedData.content.detail_pembayaran?.metode,
                        paymentBankName: parsedData.content.detail_pembayaran?.nama_bank,
                        paymentAccountNumber: parsedData.content.detail_pembayaran?.nomor_rekening,
                        paymentAccountName: parsedData.content.detail_pembayaran?.nama_pemilik_rekening,
                        signerName: parsedData.content.informasi_legal_otorisasi?.nama_penandatangan,
                        signerPosition: parsedData.content.informasi_legal_otorisasi?.jabatan_penandatangan,
                        sipaNumber: parsedData.content.informasi_legal_otorisasi?.nomor_sipa,
                        sikNumber: parsedData.content.informasi_legal_otorisasi?.nomor_sik,
                        notes: parsedData.content.informasi_legal_otorisasi?.catatan,
                        tanggal_diproses: convDate(parsedData.tanggal_diproses) || new Date(),
                        rawOcrText: parsedData.raw_ocr_text
                    }, { transaction: t });
                    const lineItems = parsedData.content.item_baris;
                    if (lineItems && lineItems.length > 0) {
                        const itemsToCreate = lineItems.map(item => ({
                            invoiceId: newInvoice.id,
                            description: item.deskripsi,
                            quantity: item.kuantitas,
                            unit: item.satuan,
                            unitPrice: item.harga_satuan,
                            discountPercentage: item.diskon_persen,
                            discountAmount: item.diskon_jumlah,
                            totalPrice: item.total_harga,
                            batchNumber: item.nomor_batch,
                            expiryDate: convDate(item.tanggal_kedaluwarsa)
                        }));
                        await InvoiceItem.bulkCreate(itemsToCreate, { transaction: t });
                    }
                    return newInvoice;
                });
                break;
            case 'STNK':
                result = await Stnk.create({
                    no: `${parsedData.content.data_kendaraan?.no}`,
                    nomorRegistrasi: parsedData.content.data_kendaraan?.nomor_registrasi,
                    namaPemilik: parsedData.content.data_kendaraan?.nama_pemilik,
                    alamat: parsedData.content.data_kendaraan?.alamat,
                    merk: parsedData.content.data_kendaraan?.merk,
                    tipe: parsedData.content.data_kendaraan?.tipe,
                    jenis: parsedData.content.data_kendaraan?.jenis,
                    model: parsedData.content.data_kendaraan?.model,
                    tahunPembuatan: parsedData.content.data_kendaraan?.tahun_pembuatan,
                    isiSilinderDayaListrik: parsedData.content.data_kendaraan?.isi_silinder,
                    nomorRangka: parsedData.content.data_kendaraan?.nomor_rangka,
                    nomorMesin: parsedData.content.data_kendaraan?.nomor_mesin,
                    nik: parsedData.content.data_kendaraan?.nik,
                    warna: parsedData.content.data_kendaraan?.warna,
                    bahanBakar: parsedData.content.data_kendaraan?.bahan_bakar,
                    warnaTnkb: parsedData.content.data_kendaraan?.warna_tnkb,
                    tahunRegistrasi: parsedData.content.data_kendaraan?.tahun_registrasi,
                    nomorBpkb: parsedData.content.data_kendaraan?.nomor_bpkb,
                    nomorUrutPendaftaran: parsedData.content.data_kendaraan?.nomor_urut_pendaftaran,
                    kodeLokasi: parsedData.content.data_kendaraan?.kode_lokasi,
                    berlakuSampai: convDate(parsedData.content.data_kendaraan?.berlaku_sampai),
                    tanggal_diproses: convDate(parsedData.tanggal_diproses) || new Date(),
                    rawOcrText: parsedData.raw_ocr_text
                });
                break;
            case 'KTP':
                result = await Ktp.create({
                    nik: parsedData.content.data_penduduk?.nik,
                    nama: parsedData.content.data_penduduk?.nama,
                    tempat_tgl_lahir: parsedData.content.data_penduduk?.tempat_tgl_lahir,
                    jenis_kelamin: parsedData.content.data_penduduk?.jenis_kelamin,
                    gol_darah: parsedData.content.data_penduduk?.gol_darah,
                    alamat: parsedData.content.data_penduduk?.alamat,
                    rt: parsedData.content.data_penduduk?.rt,
                    rw: parsedData.content.data_penduduk?.rw,
                    kel_desa: parsedData.content.data_penduduk?.kel_desa,
                    kecamatan: parsedData.content.data_penduduk?.kecamatan,
                    agama: parsedData.content.data_penduduk?.agama,
                    status_perkawinan: parsedData.content.data_penduduk?.status_perkawinan,
                    kewarganegaraan: parsedData.content.data_penduduk?.kewarganegaraan,
                    berlaku_hingga: parsedData.content.data_penduduk?.berlaku_hingga,
                    provinsi: parsedData.content.data_penduduk?.provinsi,
                    kabupaten_kota: parsedData.content.data_penduduk?.kabupaten_kota,
                    tanggal_dibuat: parsedData.content.data_penduduk?.tanggal_dibuat,
                    tanggal_diproses: convDate(parsedData.tanggal_diproses) || new Date(),
                    rawOcrText: parsedData.content.raw_ocr_text
                });
                break;
            case 'BPKB':
                result = await Bpkb.create({
                    nomorBpkb: parsedData.content.no,
                    namaPemilik: parsedData.content.identitas_pemilik?.nama_pemilik,
                    pekerjaan: parsedData.content.identitas_pemilik?.pekerjaan,
                    alamat: parsedData.content.identitas_pemilik?.alamat,
                    nomorKtp: parsedData.content.identitas_pemilik?.nomor_ktp,
                    lokasiDikeluarkan: parsedData.content.identitas_pemilik?.lokasi_dikeluarkan,
                    tanggalDikeluarkan: convDate(parsedData.content.identitas_pemilik?.tanggal_dikeluarkan),
                    nomorRegistrasi: parsedData.content.identitas_kendaraan?.nomor_registrasi,
                    merk: parsedData.content.identitas_kendaraan?.merk,
                    tipe: parsedData.content.identitas_kendaraan?.tipe,
                    jenis: parsedData.content.identitas_kendaraan?.jenis,
                    model: parsedData.content.identitas_kendaraan?.model,
                    tahunPembuatan: parsedData.content.identitas_kendaraan?.tahun_pembuatan,
                    isiSilinder: parsedData.content.identitas_kendaraan?.isi_silinder,
                    warna: parsedData.content.identitas_kendaraan?.warna,
                    nomorRangka: parsedData.content.identitas_kendaraan?.nomor_rangka,
                    nomorMesin: parsedData.content.identitas_kendaraan?.nomor_mesin,
                    bahanBakar: parsedData.content.identitas_kendaraan?.bahan_bakar,
                    jumlahSumbu: parsedData.content.identitas_kendaraan?.jumlah_sumbu,
                    jumlahRoda: parsedData.content.identitas_kendaraan?.jumlah_roda,
                    noSertifikatUjiTipe: parsedData.content.identitas_kendaraan?.no_sertifikat_uji_tipe,
                    jenisKendaraanKategori: parsedData.content.identitas_kendaraan?.jenis_kendaraan_kategori,
                    nomorFaktur: parsedData.content.dokumen_registrasi_pertama?.nomor_faktur,
                    tanggal: convDate(parsedData.content.dokumen_registrasi_pertama?.tanggal),
                    atpmImportir: parsedData.content.dokumen_registrasi_pertama?.atpm_importir,
                    nomorPib: parsedData.content.dokumen_registrasi_pertama?.nomor_pib,
                    nomorsut: parsedData.content.dokumen_registrasi_pertama?.nomor_sut,
                    nomortpt: parsedData.content.dokumen_registrasi_pertama?.nomor_tpt,
                    noFormAbc: parsedData.content.dokumen_registrasi_pertama?.no_form_abc,
                    kantorBeaCukai: parsedData.content.dokumen_registrasi_pertama?.kantor_bea_cukai,
                    noRisalahLelang: parsedData.content.dokumen_registrasi_pertama?.no_risalah_lelang,
                    noSkepDum: parsedData.content.dokumen_registrasi_pertama?.no_skep_dum,
                    perubahan: parsedData.content.perubahan?.perubahan,
                    jenisPerubahan: parsedData.content.perubahan?.jenis_perubahan,
                    lokasiPerubahanDikeluarkan: parsedData.content.perubahan?.lokasi_perubahan_dikeluarkan,
                    tanggalPerubahanDikeluarkan: convDate(parsedData.content.perubahan?.tanggal_perubahan_dikeluarkan),
                    catatanKhusus: parsedData.content.catatan_khusus,
                    tanggal_diproses: convDate(parsedData.tanggal_diproses) || new Date(),
                    rawOcrText: parsedData.raw_ocr_text
                });
                break;
            case 'DOKUMEN_UMUM':
                result = await GeneralDocument.create({
                    summary: parsedData.content.ringkasan || parsedData.content.summary,
                    keyPoints: parsedData.content.poin_kunci || parsedData.content.key_points,
                    potentialInsights: parsedData.content.insight_potensial || parsedData.content.potential_insights,
                    possibleAuthor: parsedData.content.meta_dokumen?.kemungkinan_penulis || parsedData.content.meta_dokumen?.possible_author,
                    possiblePublishDate: convDate(parsedData.content.meta_dokumen?.kemungkinan_tanggal_terbit || parsedData.content.meta_dokumen?.possible_publish_date),
                    possibleDocumentType: parsedData.content.meta_dokumen?.possible_document_type,
                    tanggal_diproses: convDate(parsedData.tanggal_diproses) || new Date(),
                    rawOcrText: parsedData.content.raw_ocr_text
                }, { transaction });
                break;
            default:
                return next(new AppError(`Tipe dokumen '${document_type}' tidak didukung untuk disimpan.`, 400));
        }

        // --- BAGIAN KUNCI UNTUK MULTI-FILE ---
        // Buat promise untuk setiap file yang akan disimpan
        const fileCreationPromises = files.map(file => {
            return fs.readFile(file.path).then(fileData => {
                return UploadedFile.create({
                    userDefinedFilename: userDefinedFilename,
                    originalFilename: file.originalname,
                    mimeType: file.mimetype,
                    fileData: fileData,
                    documentId: result.id, // Semua file terhubung ke ID record yang sama
                    documentType: document_type.toLowerCase(),
                    tanggal_diproses: convDate(parsedData.tanggal_diproses) || new Date(),
                }, { transaction });
            });
        });

        await Promise.all(fileCreationPromises);

        // 5. Jika semua berhasil, commit transaksi
        await transaction.commit();

        // Hapus file temporary setelah berhasil disimpan
        // await fs.unlink(file.path);

        res.status(201).json({
            status: 'success',
            message: `Data ${document_type} dan file berhasil disimpan.`,
            data: result
        });
    } catch (error) {
        // Jika ada error di mana pun, batalkan semua perubahan di database
        await transaction.rollback();
        // Hapus juga file temporary jika terjadi error
        await fs.unlink(files.path).catch(err => console.error("Gagal menghapus file saat error:", err));
        return next(new AppError(`Gagal menyimpan data: ${error.message}`, 500));
    }



});

// --- FUNGSI UNTUK INVOICE ---
exports.getAllInvoices = catchAsync(async (req, res, next) => {
    const invoices = await Invoice.findAll({
        order: [['createdAt', 'DESC']], // Urutkan dari yang terbaru
        // Pilih hanya kolom yang relevan untuk tampilan daftar
        attributes: ['id', 'documentNumber', 'vendorName', 'issueDate', 'grandTotal']
    });
    res.status(200).json({ status: 'success', results: invoices.length, data: invoices });
});

exports.getInvoiceById = catchAsync(async (req, res, next) => {
    const invoice = await Invoice.findByPk(req.params.id, {
        // Sertakan semua item-itemnya
        include: [{ model: InvoiceItem, as: 'lineItems' }]
    });
    if (!invoice) return next(new AppError('Invoice dengan ID tersebut tidak ditemukan.', 404));
    res.status(200).json({ status: 'success', data: invoice });
});


// --- FUNGSI UNTUK STNK ---
exports.getAllStnks = catchAsync(async (req, res, next) => {
    const stnks = await Stnk.findAll({
        order: [['createdAt', 'DESC']],
        attributes: ['id', 'nomorRegistrasi', 'namaPemilik', 'merk', 'berlakuSampai']
    });
    res.status(200).json({ status: 'success', results: stnks.length, data: stnks });
});

exports.getStnkById = catchAsync(async (req, res, next) => {
    const stnk = await Stnk.findByPk(req.params.id);
    if (!stnk) return next(new AppError('STNK dengan ID tersebut tidak ditemukan.', 404));
    res.status(200).json({ status: 'success', data: stnk });
});


// --- FUNGSI UNTUK BPKB ---
exports.getAllBpkbs = catchAsync(async (req, res, next) => {
    const bpkbs = await Bpkb.findAll({
        order: [['createdAt', 'DESC']],
        attributes: ['id', 'nomorBpkb', 'nomorRegistrasi', 'namaPemilik', 'merk']
    });
    res.status(200).json({ status: 'success', results: bpkbs.length, data: bpkbs });
});

exports.getBpkbById = catchAsync(async (req, res, next) => {
    const bpkb = await Bpkb.findByPk(req.params.id);
    if (!bpkb) return next(new AppError('BPKB dengan ID tersebut tidak ditemukan.', 404));
    res.status(200).json({ status: 'success', data: bpkb });
});

// --- FUNGSI UNTUK KTP ---
exports.getAllKtp = catchAsync(async (req, res, next) => {
    const ktp = await Ktp.findAll({
        order: [['createdAt', 'DESC']],
        attributes: ['id', 'nik', 'nama', 'tempat_tgl_lahir', 'jenis_kelamin']
    });
    res.status(200).json({ status: 'success', results: ktp.length, data: ktp });
});

exports.getKtpById = catchAsync(async (req, res, next) => {
    const ktp = await Ktp.findByPk(req.params.id);
    if (!ktp) return next(new AppError('KTP dengan ID tersebut tidak ditemukan.', 404));
    res.status(200).json({ status: 'success', data: ktp });
});

exports.getFileById = catchAsync(async (req, res, next) => {
    const { filename, documentId, documentType } = req.query;
    let whereClause = {};

    // Cek parameter yang diberikan
    if (documentId && documentType) {
        // Prioritas utama: cari berdasarkan dokumen induknya (lebih spesifik)
        whereClause.documentId = documentId;
        whereClause.documentType = documentType.toLowerCase();
    } else if (filename) {
        // Opsi kedua: cari berdasarkan nama yang diberikan pengguna
        whereClause.userDefinedFilename = filename;
    } else {
        // Jika tidak ada parameter yang valid, kembalikan error
        return next(new AppError('Parameter pencarian tidak valid. Harap berikan filename, atau documentId & documentType.', 400));
    }

    // Gunakan findOne untuk mengambil file pertama yang cocok.
    const file = await UploadedFile.findOne({ where: whereClause });

    if (!file) {
        return next(new AppError('File tidak ditemukan dengan kriteria yang diberikan.', 404));
    }

    // Set header Content-Type dan kirim data biner
    res.setHeader('Content-Type', file.mimeType);
    res.send(file.fileData);
});
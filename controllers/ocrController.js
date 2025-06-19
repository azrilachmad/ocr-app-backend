// Di dalam file: controllers/invoiceController.js

const fs = require('fs').promises;
const { Op } = require('sequelize'); // Impor Operator Sequelize untuk pencarian
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const { extractTextWithVisionAI } = require('../utils/googleVisionService');
const { extractDetailsWithGemini, identifyDocumentType } = require('../utils/geminiAiStudioService');


const { Invoice, InvoiceItem, Stnk, Bpkb, sequelize } = require('../models'); // Pastikan path ini benar
const { convDate } = require('../helper');


exports.processOcrOnly = catchAsync(async (req, res, next) => {
    // Diperbarui untuk menggunakan req.files (array)
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

        // 2. Identifikasi tipe dokumen menggunakan Gemini (Langkah AI 1)
        const documentType = await identifyDocumentType(combinedOcrText);
        console.log(`Dokumen teridentifikasi sebagai: ${documentType}`);

        if (documentType === 'TIDAK_DIKETAHUI') {
            throw new AppError('Jenis dokumen tidak dapat dikenali atau tidak didukung.', 400);
        }

        // 3. Ekstrak data berdasarkan tipe dokumen (Langkah AI 2)
        let extractedData = null;
        switch (documentType) {
            case 'INVOICE':
                extractedData = await extractDetailsWithGemini(combinedOcrText, 'INVOICE');
                break;
            case 'STNK':
                extractedData = await extractDetailsWithGemini(combinedOcrText, 'STNK');
                break;
            case 'BPKB':
                extractedData = await extractDetailsWithGemini(combinedOcrText, 'BPKB');
                break;
            default:
                throw new AppError('Proses ekstraksi tidak tersedia untuk jenis dokumen ini.', 400);
        }
        
        // 4. Sajikan hasil sesuai format yang Anda minta
        res.status(200).json({
            status: 'success',
            message: 'Dokumen berhasil diproses.',
            data: {
                document_type: documentType,
                content: extractedData,
                raw_ocr_text: combinedOcrText
            }
        });

    } finally {
        // Hapus semua file temporary
        for (const filePath of filePaths) {
            try {
                await fs.unlink(filePath);
            } catch (unlinkError) {
                console.error(`Gagal menghapus file temporary: ${filePath}`, unlinkError);
            }
        }
    }
});

/**
 * Controller terpadu untuk MENYIMPAN semua jenis dokumen ke tabel yang sesuai.
 */
exports.submitData = catchAsync(async (req, res, next) => {
    const { document_type, content, raw_ocr_text } = req.body;
    if (!document_type || !content) {
        return next(new AppError('Format data tidak valid.', 400));
    }

    let result;

    switch (document_type) {
        case 'INVOICE':
            result = await sequelize.transaction(async (t) => {
                const newInvoice = await Invoice.create({
                    invoiceType: content.informasi_umum?.tipe_dokumen?.toLowerCase().includes('pembelian') ? 'pembelian' : 'penjualan',
                    documentTitle: content.informasi_umum?.judul_dokumen,
                    documentNumber: content.informasi_umum?.nomor_dokumen,
                    taxInvoiceNumber: content.informasi_umum?.nomor_faktur_pajak,
                    purchaseOrderNumber: content.informasi_umum?.nomor_purchase_order,
                    salesOrderNumber: content.informasi_umum?.nomor_sales_order,
                    issueDate: convDate(content.informasi_umum?.tanggal_terbit),
                    dueDate: convDate(content.informasi_umum?.tanggal_jatuh_tempo),
                    salespersonName: content.informasi_umum?.nama_salesman,
                    vendorName: content.pihak_terlibat?.vendor?.nama,
                    vendorAddress: content.pihak_terlibat?.vendor?.alamat,
                    vendorPhone: content.pihak_terlibat?.vendor?.telepon,
                    vendorNpwp: content.pihak_terlibat?.vendor?.npwp,
                    customerName: content.pihak_terlibat?.pelanggan?.nama,
                    customerBillingAddress: content.pihak_terlibat?.pelanggan?.alamat_penagihan,
                    customerShippingAddress: content.pihak_terlibat?.pelanggan?.alamat_pengiriman,
                    customerPhone: content.pihak_terlibat?.pelanggan?.telepon,
                    customerNpwp: content.pihak_terlibat?.pelanggan?.npwp,
                    subtotal: content.rekapitulasi_finansial?.subtotal,
                    globalDiscountAmount: content.rekapitulasi_finansial?.total_diskon_global_jumlah,
                    taxableAmountDpp: content.rekapitulasi_finansial?.dasar_pengenaan_pajak_dpp,
                    vatAmount: content.rekapitulasi_finansial?.pajak_ppn_jumlah,
                    shippingCost: content.rekapitulasi_finansial?.ongkos_kirim,
                    stampDutyFee: content.rekapitulasi_finansial?.biaya_meterai,
                    grandTotal: content.rekapitulasi_finansial?.total_tagihan_akhir,
                    currency: content.rekapitulasi_finansial?.mata_uang,
                    amountInWords: content.rekapitulasi_finansial?.terbilang,
                    paymentMethod: content.detail_pembayaran?.metode,
                    paymentBankName: content.detail_pembayaran?.nama_bank,
                    paymentAccountNumber: content.detail_pembayaran?.nomor_rekening,
                    paymentAccountName: content.detail_pembayaran?.nama_pemilik_rekening,
                    signerName: content.informasi_legal_otorisasi?.nama_penandatangan,
                    signerPosition: content.informasi_legal_otorisasi?.jabatan_penandatangan,
                    sipaNumber: content.informasi_legal_otorisasi?.nomor_sipa,
                    sikNumber: content.informasi_legal_otorisasi?.nomor_sik,
                    notes: content.informasi_legal_otorisasi?.catatan,
                    rawOcrText: raw_ocr_text
                }, { transaction: t });
                const lineItems = content.item_baris;
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
                no: content.data_kendaraan?.no,
                nomorRegistrasi: content.data_kendaraan?.nomor_registrasi,
                namaPemilik: content.data_kendaraan?.nama_pemilik,
                alamat: content.data_kendaraan?.alamat,
                merk: content.data_kendaraan?.merk,
                tipe: content.data_kendaraan?.tipe,
                jenis: content.data_kendaraan?.jenis,
                model: content.data_kendaraan?.model,
                tahunPembuatan: content.data_kendaraan?.tahun_pembuatan,
                isiSilinderDayaListrik: content.data_kendaraan?.isi_silinder,
                nomorRangka: content.data_kendaraan?.nomor_rangka,
                nomorMesin: content.data_kendaraan?.nomor_mesin,
                nik: content.data_kendaraan?.nik,
                warna: content.data_kendaraan?.warna,
                bahanBakar: content.data_kendaraan?.bahan_bakar,
                warnaTnkb: content.data_kendaraan?.warna_tnkb,
                tahunRegistrasi: content.data_kendaraan?.tahun_registrasi,
                nomorBpkb: content.data_kendaraan?.nomor_bpkb,
                nomorUrutPendaftaran: content.data_kendaraan?.nomor_urut_pendaftaran,
                kodeLokasi: content.data_kendaraan?.kode_lokasi,
                berlakuSampai: convDate(content.data_kendaraan?.berlaku_sampai),
                rawOcrText: raw_ocr_text
            });
            break;
        case 'BPKB':
            result = await Bpkb.create({
                no: content.no,
                namaPemilik: content.identitas_pemilik?.nama_pemilik,
                pekerjaan: content.identitas_pemilik?.pekerjaan,
                alamat: content.identitas_pemilik?.alamat,
                nomorKtp: content.identitas_pemilik?.nomor_ktp,
                lokasiDikeluarkan: content.identitas_pemilik?.lokasi_dikeluarkan,
                tanggalDikeluarkan: convDate(content.identitas_pemilik?.tanggal_dikeluarkan),
                nomorRegistrasi: content.identitas_kendaraan?.nomor_registrasi,
                merk: content.identitas_kendaraan?.merk,
                tipe: content.identitas_kendaraan?.tipe,
                jenis: content.identitas_kendaraan?.jenis,
                model: content.identitas_kendaraan?.model,
                tahunPembuatan: content.identitas_kendaraan?.tahun_pembuatan,
                isiSilinder: content.identitas_kendaraan?.isi_silinder,
                warna: content.identitas_kendaraan?.warna,
                nomorRangka: content.identitas_kendaraan?.nomor_rangka,
                nomorMesin: content.identitas_kendaraan?.nomor_mesin,
                bahanBakar: content.identitas_kendaraan?.bahan_bakar,
                jumlahSumbu: content.identitas_kendaraan?.jumlah_sumbu,
                jumlahRoda: content.identitas_kendaraan?.jumlah_roda,
                noSertifikatUjiTipe: content.identitas_kendaraan?.no_sertifikat_uji_tipe,
                jenisKendaraanKategori: content.identitas_kendaraan?.jenis_kendaraan_kategori,
                nomorFaktur: content.dokumen_registrasi_pertama?.nomor_faktur,
                tanggal: convDate(content.dokumen_registrasi_pertama?.tanggal),
                atpmImportir: content.dokumen_registrasi_pertama?.atpm_importir,
                nomorPib: content.dokumen_registrasi_pertama?.nomor_pib,
                nomorsut: content.dokumen_registrasi_pertama?.nomor_sut,
                nomortpt: content.dokumen_registrasi_pertama?.nomor_tpt,
                noFormAbc: content.dokumen_registrasi_pertama?.no_form_abc,
                kantorBeaCukai: content.dokumen_registrasi_pertama?.kantor_bea_cukai,
                noRisalahLelang: content.dokumen_registrasi_pertama?.no_risalah_lelang,
                noSkepDum: content.dokumen_registrasi_pertama?.no_skep_dum,
                perubahan: content.perubahan?.perubahan,
                jenisPerubahan: content.perubahan?.jenis_perubahan,
                lokasiPerubahanDikeluarkan: content.perubahan?.lokasi_perubahan_dikeluarkan,
                tanggalPerubahanDikeluarkan: convDate(content.perubahan?.tanggal_perubahan_dikeluarkan),
                catatanKhusus: content.catatan_khusus,
                rawOcrText: raw_ocr_text
            });
            break;
        default:
            return next(new AppError(`Tipe dokumen '${document_type}' tidak didukung untuk disimpan.`, 400));
    }
    res.status(201).json({
        status: 'success',
        message: `Data ${document_type} berhasil disimpan.`,
        data: result
    });
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
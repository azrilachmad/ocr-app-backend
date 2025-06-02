// Di dalam file: controllers/invoiceController.js

const fs = require('fs').promises;
const { Op } = require('sequelize'); // Impor Operator Sequelize untuk pencarian
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const { extractTextWithVisionAI } = require('../utils/googleVisionService');
const { extractDetailsWithGemini } = require('../utils/geminiAiStudioService');

// Impor komponen database dan helper
const { Invoice, InvoiceItem, sequelize } = require('../models');
const { convDate } = require('../helper');


// === CREATE ===
exports.processOcrOnly = catchAsync(async (req, res, next) => {
    if (!req.file) return next(new AppError("Tidak ada file yang diunggah.", 400));
    const filePath = req.file.path;
    try {
        const ocrText = await extractTextWithVisionAI(filePath, req.file.mimetype);
        if (!ocrText) throw new AppError("Vision AI tidak dapat mengekstrak teks.", 400);
        const extractedData = await extractDetailsWithGemini(ocrText);
        extractedData.raw_ocr_text = ocrText;
        res.status(200).json({ status: 'success', message: 'Dokumen berhasil diproses.', data: extractedData });
    } finally {
        await fs.unlink(filePath);
    }
});

exports.submitOcrData = catchAsync(async (req, res, next) => {
    const extractedData = req.body; // Data diambil dari body request

    if (!extractedData || Object.keys(extractedData).length === 0) {
        return next(new AppError('Tidak ada data yang dikirim untuk disimpan.', 400));
    }

    try {
        const result = await sequelize.transaction(async (t) => {
            // Langkah 1: Petakan dan buat data Invoice utama
            const newInvoice = await Invoice.create({
                // Dari 'informasi_umum'
                invoiceType: extractedData.informasi_umum.tipe_dokumen?.toLowerCase().includes('pembelian') ? 'pembelian' : 'penjualan',
                documentTitle: extractedData.informasi_umum.judul_dokumen,
                documentNumber: extractedData.informasi_umum.nomor_dokumen,
                taxInvoiceNumber: extractedData.informasi_umum.nomor_faktur_pajak,
                purchaseOrderNumber: extractedData.informasi_umum.nomor_purchase_order,
                salesOrderNumber: extractedData.informasi_umum.nomor_sales_order,
                issueDate: convDate(extractedData.informasi_umum.tanggal_terbit),
                dueDate: convDate(extractedData.informasi_umum.tanggal_jatuh_tempo),
                salespersonName: extractedData.informasi_umum.nama_salesman,

                // Dari 'pihak_terlibat'
                vendorName: extractedData.pihak_terlibat.vendor.nama,
                vendorAddress: extractedData.pihak_terlibat.vendor.alamat,
                vendorPhone: extractedData.pihak_terlibat.vendor.telepon,
                vendorNpwp: extractedData.pihak_terlibat.vendor.npwp,
                customerName: extractedData.pihak_terlibat.pelanggan.nama,
                customerBillingAddress: extractedData.pihak_terlibat.pelanggan.alamat_penagihan,
                customerShippingAddress: extractedData.pihak_terlibat.pelanggan.alamat_pengiriman,
                customerPhone: extractedData.pihak_terlibat.pelanggan.telepon,
                customerNpwp: extractedData.pihak_terlibat.pelanggan.npwp,

                // Dari 'rekapitulasi_finansial'
                subtotal: extractedData.rekapitulasi_finansial.subtotal,
                globalDiscountAmount: extractedData.rekapitulasi_finansial.total_diskon_global_jumlah,
                taxableAmountDpp: extractedData.rekapitulasi_finansial.dasar_pengenaan_pajak_dpp,
                vatAmount: extractedData.rekapitulasi_finansial.pajak_ppn_jumlah,
                shippingCost: extractedData.rekapitulasi_finansial.ongkos_kirim,
                stampDutyFee: extractedData.rekapitulasi_finansial.biaya_meterai,
                grandTotal: extractedData.rekapitulasi_finansial.total_tagihan_akhir,
                currency: extractedData.rekapitulasi_finansial.mata_uang,
                amountInWords: extractedData.rekapitulasi_finansial.terbilang,

                // Dari 'detail_pembayaran'
                paymentMethod: extractedData.detail_pembayaran.metode,
                paymentBankName: extractedData.detail_pembayaran.nama_bank,
                paymentAccountNumber: extractedData.detail_pembayaran.nomor_rekening,
                paymentAccountName: extractedData.detail_pembayaran.nama_pemilik_rekening,

                // Dari 'informasi_legal_otorisasi'
                signerName: extractedData.informasi_legal_otorisasi.nama_penandatangan,
                signerPosition: extractedData.informasi_legal_otorisasi.jabatan_penandatangan,
                sipaNumber: extractedData.informasi_legal_otorisasi.nomor_sipa,
                sikNumber: extractedData.informasi_legal_otorisasi.nomor_sik,
                notes: extractedData.informasi_legal_otorisasi.catatan,

                // Data mentah hasil OCR
                rawOcrText: extractedData.raw_ocr_text

            }, { transaction: t });

            // Langkah 2: Siapkan dan simpan semua item baris
            const lineItems = extractedData.item_baris;
            if (lineItems && lineItems.length > 0) {
                const itemsToCreate = lineItems.map(item => ({
                    invoiceId: newInvoice.id, // Kunci penghubung
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
                await InvoiceItem.bulkCreate(itemsToCreate, { transaction: t, validate: true });
            }
            return newInvoice;
        });

        res.status(201).json({
            status: 'success',
            message: 'Data invoice berhasil disimpan ke database.',
            data: result
        });

    } catch (error) {
        // Jika ada error validasi atau lainnya, teruskan ke global error handler
        return next(new AppError(`Gagal menyimpan data ke database: ${error.message}`, 500));
    }
});



// === READ ===
exports.getAllInvoices = catchAsync(async (req, res, next) => {
    const invoices = await Invoice.findAll({
        order: [['issue_date', 'DESC']],
        attributes: ['id', 'documentNumber', 'vendorName', 'customerName', 'issueDate', 'grandTotal']
    });
    res.status(200).json({ status: 'success', results: invoices.length, data: { invoices } });
});

exports.getInvoiceById = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const invoice = await Invoice.findByPk(id, { include: [{ model: InvoiceItem, as: 'lineItems' }] });
    if (!invoice) return next(new AppError('Invoice tidak ditemukan.', 404));
    res.status(200).json({ status: 'success', data: { invoice } });
});

exports.findInvoices = catchAsync(async (req, res, next) => {
    const { vendorName, docNumber } = req.query;
    const whereClause = {};
    if (vendorName) whereClause.vendorName = { [Op.like]: `%${vendorName}%` };
    if (docNumber) whereClause.documentNumber = docNumber;
    const invoices = await Invoice.findAll({ where: whereClause, order: [['issue_date', 'DESC']] });
    res.status(200).json({ status: 'success', results: invoices.length, data: { invoices } });
});


// === UPDATE ===
exports.updateInvoice = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const updateData = req.body; // Data pembaruan dari body request

    if (!updateData || Object.keys(updateData).length === 0) {
        return next(new AppError('Tidak ada data yang dikirim untuk pembaruan.', 400));
    }

    try {
        const result = await sequelize.transaction(async (t) => {
            // 1. Cari invoice yang akan diupdate
            const invoiceToUpdate = await Invoice.findByPk(id, { transaction: t });
            if (!invoiceToUpdate) {
                throw new AppError('Tidak ada invoice yang ditemukan dengan ID tersebut untuk diperbarui.', 404);
            }

            // 2. Update field-field utama dari Invoice menggunakan data dari updateData
            // Ini adalah bagian yang kita lengkapi pemetaannya:
            await invoiceToUpdate.update({
                // Dari 'informasi_umum'
                invoiceType: updateData.informasi_umum?.tipe_dokumen?.toLowerCase().includes('pembelian') ? 'pembelian' : 
                             (updateData.informasi_umum?.tipe_dokumen?.toLowerCase().includes('penjualan') ? 'penjualan' : 'tidak_diketahui'),
                documentTitle: updateData.informasi_umum?.judul_dokumen,
                documentNumber: updateData.informasi_umum?.nomor_dokumen,
                taxInvoiceNumber: updateData.informasi_umum?.nomor_faktur_pajak,
                purchaseOrderNumber: updateData.informasi_umum?.nomor_purchase_order,
                salesOrderNumber: updateData.informasi_umum?.nomor_sales_order,
                issueDate: convDate(updateData.informasi_umum?.tanggal_terbit),
                dueDate: convDate(updateData.informasi_umum?.tanggal_jatuh_tempo),
                salespersonName: updateData.informasi_umum?.nama_salesman,

                // Dari 'pihak_terlibat'
                vendorName: updateData.pihak_terlibat?.vendor?.nama,
                vendorAddress: updateData.pihak_terlibat?.vendor?.alamat,
                vendorPhone: updateData.pihak_terlibat?.vendor?.telepon,
                vendorNpwp: updateData.pihak_terlibat?.vendor?.npwp,
                customerName: updateData.pihak_terlibat?.pelanggan?.nama,
                customerBillingAddress: updateData.pihak_terlibat?.pelanggan?.alamat_penagihan,
                customerShippingAddress: updateData.pihak_terlibat?.pelanggan?.alamat_pengiriman,
                customerPhone: updateData.pihak_terlibat?.pelanggan?.telepon,
                customerNpwp: updateData.pihak_terlibat?.pelanggan?.npwp,

                // Dari 'rekapitulasi_finansial'
                subtotal: updateData.rekapitulasi_finansial?.subtotal,
                globalDiscountAmount: updateData.rekapitulasi_finansial?.total_diskon_global_jumlah,
                taxableAmountDpp: updateData.rekapitulasi_finansial?.dasar_pengenaan_pajak_dpp,
                vatAmount: updateData.rekapitulasi_finansial?.pajak_ppn_jumlah,
                shippingCost: updateData.rekapitulasi_finansial?.ongkos_kirim,
                stampDutyFee: updateData.rekapitulasi_finansial?.biaya_meterai,
                grandTotal: updateData.rekapitulasi_finansial?.total_tagihan_akhir,
                currency: updateData.rekapitulasi_finansial?.mata_uang,
                amountInWords: updateData.rekapitulasi_finansial?.terbilang,

                // Dari 'detail_pembayaran'
                paymentMethod: updateData.detail_pembayaran?.metode,
                paymentBankName: updateData.detail_pembayaran?.nama_bank,
                paymentAccountNumber: updateData.detail_pembayaran?.nomor_rekening,
                paymentAccountName: updateData.detail_pembayaran?.nama_pemilik_rekening,

                // Dari 'informasi_legal_otorisasi'
                signerName: updateData.informasi_legal_otorisasi?.nama_penandatangan,
                signerPosition: updateData.informasi_legal_otorisasi?.jabatan_penandatangan,
                sipaNumber: updateData.informasi_legal_otorisasi?.nomor_sipa,
                sikNumber: updateData.informasi_legal_otorisasi?.nomor_sik,
                notes: updateData.informasi_legal_otorisasi?.catatan,

                // Data mentah hasil OCR (jika ingin diupdate juga)
                // Jika tidak ingin rawOcrText diupdate, Anda bisa menghapus baris ini
                // atau memberinya logika: updateData.raw_ocr_text || invoiceToUpdate.rawOcrText
                rawOcrText: updateData.raw_ocr_text 

            }, { transaction: t });

            // 3. Handle pembaruan item_baris: Hapus item lama dan buat yang baru
            await InvoiceItem.destroy({ where: { invoiceId: id }, transaction: t });

            const lineItems = updateData.item_baris;
            if (lineItems && lineItems.length > 0) {
                const itemsToCreate = lineItems.map(item => ({
                    invoiceId: invoiceToUpdate.id, // Gunakan ID invoice yang sedang diupdate
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
                await InvoiceItem.bulkCreate(itemsToCreate, { transaction: t, validate: true });
            }

            // Ambil kembali data yang sudah diupdate beserta item-itemnya untuk dikirim sebagai respons
            return await Invoice.findByPk(id, {
                include: [{ model: InvoiceItem, as: 'lineItems' }],
                transaction: t
            });
        });

        // Jika transaksi berhasil tapi result kosong (seharusnya tidak terjadi karena ada throw error di atas jika invoiceToUpdate tidak ditemukan)
        if (!result) { 
             return next(new AppError('Gagal memperbarui invoice, invoice tidak ditemukan setelah transaksi.', 404));
        }

        res.status(200).json({
            status: 'success',
            message: 'Data invoice berhasil diperbarui.',
            data: result
        });

    } catch (error) {
        // Jika error berasal dari AppError yang di-throw di dalam transaksi (misal, invoice tidak ditemukan)
        if (error instanceof AppError) {
            return next(error);
        }
        // Untuk error lainnya dari database atau sequelize
        return next(new AppError(`Gagal memperbarui data invoice: ${error.message}`, 500));
    }
});


// === DELETE ===
exports.deleteInvoice = catchAsync(async (req, res, next) => {
    // ... (kode fungsi deleteInvoice yang sudah kita bahas sebelumnya) ...
    // Pastikan kode lengkapnya ada di sini
    const { id } = req.params;
    try {
        await sequelize.transaction(async(t) => {
            const invoiceToDelete = await Invoice.findByPk(id, { transaction: t });
            if (!invoiceToDelete) throw new AppError('Invoice tidak ditemukan untuk dihapus.', 404);
            await InvoiceItem.destroy({ where: { invoiceId: id }, transaction: t });
            await invoiceToDelete.destroy({ transaction: t });
        });
        res.status(204).send();
    } catch(error) {
        if (error instanceof AppError) return next(error);
        return next(new AppError(`Gagal menghapus invoice: ${error.message}`, 500));
    }
});
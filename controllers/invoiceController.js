// OCR-APP-BACKEND/controllers/invoiceController.js
const fs = require('fs').promises;
const path = require('path');


// Impor layanan baru
const { extractTextWithVisionAI } = require('../utils/googleVisionService');
const { extractDetailsWithGemini } = require('../utils/geminiAiStudioService');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');

// Ganti nama controller agar lebih sesuai (opsional, tapi disarankan)
const ocrInvoiceController = catchAsync(async (req, res, next) => {
    if (!req.file) {
        return next(new AppError("Tidak ada file yang diunggah atau file ditolak oleh filter.", 400));
    }

    const originalFilePath = req.file.path;
    const originalFileName = req.file.originalname;
    const mimeType = req.file.mimetype;

    console.log(`Menerima file: ${originalFileName}, tipe: ${mimeType}, disimpan sementara sebagai: ${originalFilePath}`);

    // Blok try...finally tetap untuk pembersihan file
    try {
        // Konversi PDF ke gambar tidak lagi diperlukan di sini karena Vision API bisa menangani PDF (dengan batasan)
        console.log(`INFO: Memulai pemrosesan dengan Google Vision AI untuk file: ${originalFileName}`);
        const ocrText = await extractTextWithVisionAI(originalFilePath, mimeType);

        if (!ocrText || ocrText.trim() === "") {
            console.warn(`Google Vision AI tidak dapat mengekstrak teks dari: ${originalFileName}`);
            // Jangan teruskan ke Gemini jika tidak ada teks
            throw new AppError("Google Vision AI tidak dapat mengekstrak teks, atau file tidak mengandung teks yang dapat dibaca.", 400);
        }
        console.log(`INFO: Teks dari Google Vision AI (file: ${originalFileName}) diterima, panjang: ${ocrText.length}`);
        // Untuk debug, uncomment:
        // console.debug("Preview Teks OCR dari Vision AI:", ocrText.substring(0, 500) + "...");

        console.log(`INFO: Mengirim teks OCR (dari ${originalFileName}) ke Gemini API...`);
        const extractedData = await extractDetailsWithGemini(ocrText); // Gemini akan melakukan semua ekstraksi field
        console.log(`INFO: Data dari Gemini API (dari ${originalFileName}) berhasil diterima.`);

        res.status(200).json({
            message: "Invoice berhasil diproses dengan Google Vision AI dan Gemini API", // Pesan diupdate
            fileName: originalFileName,
            processedFileType: mimeType,
            extracted_data: extractedData,
            ocr_source_text_preview: ocrText.substring(0, 250) + (ocrText.length > 250 ? "..." : "")
        });

    } finally {
        // Pembersihan file asli yang diunggah
        if (originalFilePath) {
            try {
                await fs.unlink(originalFilePath);
                console.log(`File asli yang diunggah ${originalFilePath} (dari ${originalFileName}) berhasil dihapus.`);
            } catch (unlinkError) {
                if (unlinkError.code !== 'ENOENT') {
                    console.error(`Gagal menghapus file asli ${originalFilePath} (dari ${originalFileName}):`, unlinkError);
                }
            }
        }
        // Tidak ada tempImageFromPdfPath yang perlu dihapus jika Vision API menangani PDF
    }
});

// Pastikan nama export konsisten jika Anda mengganti nama fungsi controller
module.exports = { ocrInvoiceController };
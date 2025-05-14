// OCR-APP-BACKEND/controllers/invoiceController.js
const fs = require('fs').promises;
const path = require('path');

const { runOcrWithTesseract } = require('../utils/tesseractService');
const { extractDetailsWithGemini } = require('../utils/geminiAiStudioService');
const { convertPdfToPng } = require('../utils/pdfConverterService');
const AppError = require('../utils/appError'); // Impor AppError
const catchAsync = require('../utils/catchAsync'); // Impor catchAsync

const tesseractLang = process.env.TESSERACT_LANG || 'eng';

const ocrInvoiceTesseractController = catchAsync(async (req, res, next) => {
    if (!req.file) {
        return next(new AppError("Tidak ada file yang diunggah atau file ditolak oleh filter.", 400));
    }

    const originalFilePath = req.file.path;
    const originalFileName = req.file.originalname;
    console.log(`Menerima file: ${originalFileName}, tipe: ${req.file.mimetype}, disimpan sementara sebagai: ${originalFilePath}`);

    let filePathForOcr = originalFilePath;
    let tempImageFromPdfPath = null;

    // Menggunakan blok try...finally untuk memastikan pembersihan file selalu terjadi,
    // bahkan jika error dilempar dari dalam dan ditangkap oleh catchAsync.
    try {
        if (req.file.mimetype === 'application/pdf') {
            console.log(`File ${originalFileName} adalah PDF, memulai konversi ke gambar (halaman pertama)...`);
            const outputDirectory = path.dirname(originalFilePath);
            const outputImagePrefix = `pdfconv_${path.parse(originalFileName).name.replace(/[^a-zA-Z0-9_]/g, '_')}_${Date.now()}`;

            // Fungsi convertPdfToPng sendiri sudah memiliki try...catch dan akan melempar error jika gagal
            // catchAsync akan menangkap error tersebut.
            tempImageFromPdfPath = await convertPdfToPng(originalFilePath, outputDirectory, outputImagePrefix);
            filePathForOcr = tempImageFromPdfPath;
            console.log(`PDF ${originalFileName} berhasil dikonversi ke gambar: ${filePathForOcr}`);
        }

        console.log(`Memulai pemrosesan OCR untuk file (gambar): ${path.basename(filePathForOcr)} dengan bahasa: ${tesseractLang}`);
        // runOcrWithTesseract juga sudah memiliki try...catch dan akan melempar error
        const ocrText = await runOcrWithTesseract(filePathForOcr, tesseractLang);

        if (!ocrText || ocrText.trim() === "") {
            console.warn(`Tesseract tidak dapat mengekstrak teks dari: ${path.basename(filePathForOcr)} (file asli: ${originalFileName})`);
            // Lempar AppError agar ditangani oleh global error handler
            throw new AppError("Tesseract tidak dapat mengekstrak teks, atau file tidak mengandung teks yang dapat dibaca.", 400);
        }
        console.log(`Teks dari Tesseract (file olahan: ${path.basename(filePathForOcr)}, asli: ${originalFileName}) diterima, panjang: ${ocrText.length}`);

        console.log(`Mengirim teks OCR (dari ${originalFileName}) ke Gemini API...`);
        // extractDetailsWithGemini juga sudah memiliki try...catch dan akan melempar error
        const extractedData = await extractDetailsWithGemini(ocrText);
        console.log(`Data dari Gemini API (dari ${originalFileName}) berhasil diterima.`);

        res.status(200).json({
            message: "Invoice berhasil diproses",
            fileName: originalFileName,
            processedFileType: req.file.mimetype,
            extracted_data: extractedData,
            ocr_source_text_preview: ocrText.substring(0, 250) + (ocrText.length > 250 ? "..." : "")
        });

    } finally {
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
        if (tempImageFromPdfPath && tempImageFromPdfPath !== originalFilePath) { // Pastikan tidak menghapus file yang sama dua kali
            try {
                await fs.unlink(tempImageFromPdfPath);
                console.log(`Gambar sementara hasil konversi PDF ${tempImageFromPdfPath} (dari ${originalFileName}) berhasil dihapus.`);
            } catch (unlinkError) {
                if (unlinkError.code !== 'ENOENT') {
                    console.error(`Gagal menghapus gambar sementara ${tempImageFromPdfPath} (dari ${originalFileName}):`, unlinkError);
                }
            }
        }
    }
});

module.exports = { ocrInvoiceTesseractController };
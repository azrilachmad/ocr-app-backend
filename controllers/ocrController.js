// Di dalam file: controllers/invoiceController.js

const fs = require('fs').promises;
const { Op } = require('sequelize'); // Impor Operator Sequelize untuk pencarian
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const { extractTextWithVisionAI } = require('../utils/googleVisionService');
const { extractDetailsWithGemini, identifyDocumentType } = require('../utils/geminiAiStudioService');

// Impor komponen database dan helper
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
                content: extractedData
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


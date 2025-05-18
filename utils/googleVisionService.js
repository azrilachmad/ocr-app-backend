// OCR-APP-BACKEND/utils/googleVisionService.js
const { ImageAnnotatorClient } = require('@google-cloud/vision').v1;
const fs = require('fs').promises;
const path = require('path');

const client = new ImageAnnotatorClient();

async function extractTextWithVisionAI(filePath, mimeType) {
    console.log(`INFO: Membaca file untuk Vision API: ${path.basename(filePath)}`);
    const fileContent = await fs.readFile(filePath);

    const request = {
        image: {
            content: fileContent,
        },
        // --- HAPUS ATAU KOMENTARI BARIS 'features' DI BAWAH INI ---
        // features: [{ type: 'DOCUMENT_TEXT_DETECTION' }], // Ini menyebabkan error untuk documentTextDetection()
        // ---------------------------------------------------------
        imageContext: {
            // languageHints: ['id', 'en'], // Tetap bisa digunakan jika perlu
        }
    };

    if (mimeType === 'application/pdf') {
        console.log(`INFO: Mengirim PDF '${path.basename(filePath)}' ke Vision API (documentTextDetection).`);
    } else {
        console.log(`INFO: Mengirim gambar '${path.basename(filePath)}' ke Vision API (documentTextDetection).`);
    }

    try {
        // Panggil metode documentTextDetection dengan request yang sudah dimodifikasi
        const [result] = await client.documentTextDetection(request);
        const fullTextAnnotation = result.fullTextAnnotation;

        if (result.error && result.error.message) {
            console.error(`ERROR dari Vision API untuk file '${path.basename(filePath)}':`, result.error.message);
            throw new Error(`Vision API error: ${result.error.message}`);
        }

        if (fullTextAnnotation && fullTextAnnotation.text) {
            console.log(`INFO: Vision AI berhasil mengekstrak teks dari '${path.basename(filePath)}'. Panjang teks: ${fullTextAnnotation.text.length}`);
            return fullTextAnnotation.text;
        } else {
            console.warn(`PERINGATAN: Vision AI tidak mengembalikan anotasi teks dari '${path.basename(filePath)}'. Respons:`, JSON.stringify(result).substring(0, 500) + "...");
            throw new Error("Vision AI tidak dapat mengekstrak teks dari dokumen atau dokumen kosong.");
        }
    } catch (error) {
        console.error(`ERROR saat memanggil Vision API untuk file '${path.basename(filePath)}':`, error);
        throw new Error(`Gagal memproses dokumen dengan Vision AI: ${error.message}`);
    }
}

module.exports = { extractTextWithVisionAI };
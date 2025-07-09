// OCR-APP-BACKEND/utils/googleVisionService.js
const { ImageAnnotatorClient } = require('@google-cloud/vision').v1;
const fs = require('fs').promises;
const path = require('path');

const client = new ImageAnnotatorClient();

/**
 * Fungsi utama yang telah diperbarui untuk menangani semua jenis file.
 */
async function extractTextWithVisionAI(filePath, mimeType) {
    console.log(`INFO: Membaca file '${path.basename(filePath)}' dengan tipe ${mimeType}.`);
    
    // --- LOGIKA KONDISIONAL BARU ---
    // Cek apakah tipe file didukung oleh batchAnnotateFiles
    if (['application/pdf', 'image/tiff', 'image/gif'].includes(mimeType)) {
        // Jika ya, gunakan metode batch yang efisien untuk dokumen multi-halaman
        return processDocumentFile(filePath, mimeType);
    } else {
        // Jika tidak (misalnya PNG, JPEG), gunakan metode standar untuk satu gambar
        return processSingleImage(filePath, mimeType);
    }
}

/**
 * Memproses file gambar tunggal (seperti PNG, JPEG) dengan documentTextDetection.
 */
async function processSingleImage(filePath, mimeType) {
    console.log(`INFO: Menggunakan metode 'documentTextDetection' untuk gambar tipe ${mimeType}.`);
    const content = await fs.readFile(filePath);
    const request = {
        image: { content: content },
    };

    try {
        const [result] = await client.documentTextDetection(request);
        if (result.error && result.error.message) {
            throw new Error(`Vision API error: ${result.error.message}`);
        }
        const fullText = result.fullTextAnnotation?.text || '';
        console.log(`INFO: Ekstraksi dari gambar tunggal berhasil. Panjang teks: ${fullText.length}`);
        return fullText;
    } catch (error) {
        console.error(`ERROR saat memproses gambar tunggal:`, error);
        throw new Error(`Gagal memproses gambar: ${error.message}`);
    }
}

/**
 * Memproses file dokumen (seperti PDF, TIFF) dengan batchAnnotateFiles.
 */
async function processDocumentFile(filePath, mimeType) {
    console.log(`INFO: Menggunakan metode 'batchAnnotateFiles' untuk dokumen tipe ${mimeType}.`);
    const content = await fs.readFile(filePath);
    const request = {
        requests: [{
            inputConfig: { mimeType: mimeType, content: content },
            features: [{ type: 'DOCUMENT_TEXT_DETECTION' }],
            pages: [],
        }],
    };

    try {
        const [result] = await client.batchAnnotateFiles(request);
        const responses = result.responses[0].responses;
        let fullText = '';
        for (const response of responses) {
            fullText += response.fullTextAnnotation?.text || '';
        }
        
        if (fullText) {
            console.log(`INFO: Ekstraksi dari dokumen berhasil. Panjang total teks: ${fullText.length}`);
            return fullText;
        } else {
            const error = result.responses[0]?.error;
            if (error) throw new Error(`Vision API error: ${error.message}`);
            throw new Error("Vision AI tidak dapat mengekstrak teks dari dokumen.");
        }
    } catch (error) {
        console.error(`ERROR saat memproses dokumen:`, error);
        if (error.message.includes('Bad image data')) {
            throw new Error(`Gagal memproses dokumen: Vision API menolak file. File mungkin terproteksi atau formatnya tidak didukung.`);
        }
        throw new Error(`Gagal memproses dokumen dengan Vision AI: ${error.message}`);
    }
}

module.exports = { extractTextWithVisionAI };
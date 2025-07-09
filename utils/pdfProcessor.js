// File baru: utils/pdfProcessor.js
const { PDFDocument } = require('pdf-lib');
const fs = require('fs').promises;

/**
 * Membaca file PDF, memuatnya, lalu menyimpannya kembali untuk membersihkan struktur.
 * @param {string} filePath - Path ke file PDF yang diunggah.
 * @returns {Promise<Buffer>} - Buffer dari file PDF yang sudah bersih.
 */
async function cleanPdf(filePath) {
  try {
    console.log(`INFO: Memulai pembersihan PDF untuk file: ${filePath}`);
    // Baca file asli
    const pdfBytes = await fs.readFile(filePath);
    
    // Muat dokumen PDF dengan pdf-lib
    const pdfDoc = await PDFDocument.load(pdfBytes, {
        // Abaikan error jika ada font custom yang tidak bisa dibaca
        ignoreEncryption: true 
    });

    // Simpan dokumen ke dalam buffer baru. Proses ini akan menstandarkan ulang strukturnya.
    const cleanedPdfBytes = await pdfDoc.save();
    
    console.log('INFO: PDF berhasil dibersihkan dan distandarkan ulang.');
    return Buffer.from(cleanedPdfBytes);
  } catch (error) {
    console.error('ERROR saat memproses PDF dengan pdf-lib:', error);
    // Jika gagal, coba kembalikan buffer asli sebagai fallback
    // atau lempar error jika ingin proses berhenti
    throw new Error(`Gagal memproses PDF: ${error.message}`);
  }
}

module.exports = { cleanPdf };
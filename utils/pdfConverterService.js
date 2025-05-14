// OCR-APP-BACKEND/utils/pdfConverterService.js
const path = require("path");
const fs = require("fs").promises;

const pdfPopplerModule = require("pdf-poppler");
console.log("DEBUG (Opsi 2): Isi dari modul pdf-poppler:", pdfPopplerModule);

// Kita tidak lagi mencoba menggunakan 'new Poppler()'
// Kita akan mencoba menggunakan pdfPopplerModule.convert jika itu adalah fungsi

async function convertPdfToPng(pdfFilePath, outputDirectory, outputImagePrefix) {
    // Periksa apakah fungsi 'convert' ada di modul yang diimpor
    if (typeof pdfPopplerModule.convert !== 'function') {
        console.error("FATAL ERROR: Fungsi 'convert' tidak ditemukan di modul pdf-poppler.");
        console.error("DEBUG (Opsi 2): pdfPopplerModule.convert adalah:", pdfPopplerModule.convert);
        throw new Error("Fungsi 'convert' tidak tersedia di pustaka pdf-poppler yang terinstal.");
    }

    // Tentukan path output lengkap untuk file PNG halaman pertama
    // Fungsi 'convert' mungkin menangani penamaan output secara berbeda, kita coba kontrol
    const outputPngPath = path.join(outputDirectory, `${outputImagePrefix}-1.png`);

    // Opsi untuk konversi. Ini mungkin perlu disesuaikan berdasarkan bagaimana fungsi 'convert' bekerja.
    // Kita asumsikan formatnya mirip dengan apa yang dibutuhkan oleh metode pdfToCairo atau opsi umum.
    const options = {
        format: "png",        // Minta output PNG
        out_dir: outputDirectory, // Direktori output
        out_prefix: outputImagePrefix, // Prefix untuk nama file output
        page: 1,              // Hanya konversi halaman pertama
        resolution_x: 300,    // Resolusi X
        resolution_y: 300     // Resolusi Y
        // Opsi lain mungkin diperlukan atau didukung, ini tebakan.
    };

    // Path ke binary poppler, jika fungsi convert memerlukannya secara eksplisit
    // atau jika POPPLER_PATH perlu di-set agar fungsi convert menemukannya.
    // Fungsi convert internal mungkin sudah menggunakan POPPLER_PATH atau path default.
    const popplerBinPath = process.env.POPPLER_PATH || pdfPopplerModule.path; // Menggunakan path dari modul jika POPPLER_PATH tidak ada
    console.log(`INFO (Opsi 2): Menggunakan Poppler binary path: ${popplerBinPath || 'Path internal modul atau PATH sistem'}`);
    // Beberapa versi mungkin memerlukan path binary sebagai bagian dari opsi, atau tidak sama sekali jika sudah dikonfigurasi.

    try {
        await fs.access(pdfFilePath);
        console.log(`INFO (Opsi 2): Memulai konversi PDF: ${path.basename(pdfFilePath)} menggunakan pdfPopplerModule.convert()...`);

        // Panggil fungsi convert. Urutan argumen dan struktur opsi mungkin perlu disesuaikan.
        // Ini adalah tebakan umum: convert(inputFile, outputFileOrPrefix, options)
        // Atau convert(inputFile, options) jika output dikontrol oleh out_dir dan out_prefix
        // Untuk sekarang, mari kita coba dengan asumsi fungsi 'convert' akan menggunakan out_dir dan out_prefix dari opsi
        // dan mungkin tidak butuh argumen path output eksplisit jika sudah ada di opsi.
        // Jika 'convert' adalah promise:
        await pdfPopplerModule.convert(pdfFilePath, options);
        // Atau jika ia adalah callback-style, ini akan lebih rumit. Mari asumsikan promise dulu.

        // Verifikasi bahwa file output telah dibuat
        await fs.access(outputPngPath);
        console.log(`INFO (Opsi 2): PDF berhasil dikonversi ke: ${outputPngPath}`);
        return outputPngPath;

    } catch (error) {
        console.error(`ERROR (Opsi 2): Gagal mengonversi PDF ${path.basename(pdfFilePath)}:`, error.stderr || error.message || error);
        const errorMessage = error.stderr || error.message || 'Unknown Poppler error during convert';
        if (typeof errorMessage === 'string' && (errorMessage.includes('ENOENT') || errorMessage.toLowerCase().includes('command not found') || errorMessage.toLowerCase().includes('poppler'))) {
            console.error("KRITIKAL (Opsi 2): Kemungkinan besar binary Poppler tidak ditemukan atau tidak dapat diakses. Pastikan Poppler terinstal dan ada di PATH sistem, atau POPPLER_PATH di .env sudah benar, atau path internal modul valid.");
        }
        throw new Error(`Konversi PDF ke PNG gagal menggunakan pdfPopplerModule.convert(): ${errorMessage}`);
    }
}

module.exports = { convertPdfToPng };
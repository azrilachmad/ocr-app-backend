// OCR-APP-BACKEND/index.js
require('dotenv').config();
const express = require('express');
const multer = require('multer');
const AppError = require('./utils/appError'); // Impor AppError
const invoiceRoutes = require('./routes/upload');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/invoice', invoiceRoutes);

app.get('/', (req, res) => {
    res.status(200).json({
        message: "OCR App Backend is running. Use POST /api/invoice/process to upload an invoice image or PDF.",
        poppler_path_info: `Poppler path (optional, for pdf-poppler) can be set via POPPLER_PATH in .env. Current: ${process.env.POPPLER_PATH || 'System PATH'}`
    });
});

// Global Error Handling Middleware (diperbarui)
app.use((err, req, res, next) => {
    // Default status code dan status jika tidak di-set oleh error spesifik
    err.statusCode = err.statusCode || 500;
    err.status = err.status || 'error';

    // Log error untuk debugging
    // Di produksi, gunakan logger yang lebih canggih (misalnya Winston)
    console.error('ERROR 💥:', err.name, '-', err.message);
    if (process.env.NODE_ENV === 'development') {
        console.error('Stack:', err.stack);
    }


    if (err instanceof multer.MulterError) {
        return res.status(400).json({ // Selalu 400 untuk Multer errors
            status: 'fail',
            message: `Kesalahan unggah file: ${err.message}`,
            code: err.code
        });
    }

    // Khusus untuk error "Tipe file tidak didukung" dari fileFilter Multer
    // (Meskipun bisa juga dibuat sebagai AppError dari fileFilter)
    if (err.message && err.message.includes('Tipe file tidak didukung')) {
        return res.status(400).json({ // Selalu 400
            status: 'fail',
            message: err.message
        });
    }

    // Jika ini adalah AppError, kita percaya error ini dan mengirim respons yang sesuai
    if (err.isOperational) { // Menggunakan flag isOperational dari AppError
        return res.status(err.statusCode).json({
            status: err.status,
            message: err.message
        });
    }

    // Untuk error yang tidak terduga atau bukan AppError (error pemrograman atau dari pustaka lain)
    // Kirim respons generik agar tidak membocorkan detail internal, terutama di produksi
    // Di mode development, kita bisa kirim lebih banyak detail
    if (process.env.NODE_ENV === 'development') {
        res.status(err.statusCode).json({
            status: err.status,
            error: err, // Kirim objek error lengkap di dev
            message: err.message,
            stack: err.stack
        });
    } else {
        // Di produksi, kirim pesan generik
        res.status(500).json({
            status: 'error',
            message: 'Terjadi kesalahan internal pada server. Mohon coba lagi nanti.'
        });
    }
});

app.listen(port, () => {
    console.log(`Server OCR App Backend berjalan di http://localhost:${port}`);
    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === "YOUR_GEMINI_API_KEY") {
        console.warn("PERINGATAN: GEMINI_API_KEY belum diatur dengan benar di file .env!");
    }
    if (!process.env.TESSERACT_LANG) {
        console.warn("PERINGATAN: TESSERACT_LANG tidak diatur di .env.");
    } else {
        console.log(`Bahasa Tesseract yang akan digunakan (dari .env): ${process.env.TESSERACT_LANG}`);
    }
    console.log(`Untuk dukungan PDF, pastikan Poppler utilities terinstal (POPPLER_PATH: ${process.env.POPPLER_PATH || 'dari System PATH'}).`);
});
// index.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');

// Impor sequelize untuk sinkronisasi database
const { sequelize } = require('./models'); // Pastikan Anda sudah membuat models/index.js

// Impor rute terpadu
const ocrRoute = require('./routes/ocrRoute'); 
const globalErrorHandler = require('./utils/errorHandler');

const app = express();
const port = process.env.PORT || 3001; // Menggunakan port dari .env atau default 3001

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rute Terpadu - Menggunakan prefix /api/ocr yang lebih generik
app.use('/api/ocr', ocrRoute);

// Rute dasar untuk cek status
app.get('/', (req, res) => {
    res.status(200).json({
        message: "OCR App Backend is running.",
        endpoints: {
            process_document: "POST /api/ocr/process",
            submit_data: "POST /api/ocr/submit"
        }
    });
});

// Middleware untuk Global Error Handling (harus paling akhir)
app.use(globalErrorHandler);

// Fungsi untuk memulai server setelah database siap
const startServer = async () => {
  try {
    // 1. Coba otentikasi koneksi database
    await sequelize.authenticate();
    console.log('✅ Koneksi database berhasil.');

    // 2. Sinkronkan model dengan database (membuat tabel jika belum ada)
    // Hapus { force: true } di produksi
    await sequelize.sync(); 
    console.log('✅ Semua model berhasil disinkronkan. Tabel sudah siap.');

    // 3. Jalankan server HANYA JIKA database sudah siap
    app.listen(port, () => {
      console.log(`🚀 Server OCR App Backend berjalan di http://localhost:${port}`);
      if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY.includes("YOUR_GEMINI_API_KEY")) {
        console.warn("⚠️  PERINGATAN: GEMINI_API_KEY belum diatur dengan benar di file .env!");
      }
    });

  } catch (error) {
    console.error('❌ Gagal memulai server atau terhubung ke database:', error);
  }
};

// Panggil fungsi untuk memulai server
startServer();
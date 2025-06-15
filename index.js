// OCR-APP-BACKEND/index.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');

const ocrRoute = require('./routes/ocrRoute'); // Impor rute invoice
const globalErrorHandler = require('./utils/errorHandler'); // Impor global error handler

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rute
app.use('/api/invoice', ocrRoute);

app.get('/', (req, res) => {
    res.status(200).json({
        message: "OCR App Backend is running.",
        database_status: "Connected and synchronized.",
        endpoints: {
            process_ocr: "POST /api/invoice/process-ocr",
            submit_data: "POST /api/invoice/submit-data"
        }
    });
});

// Gunakan Global Error Handling Middleware yang terpusat
app.use(globalErrorHandler);

// Fungsi untuk memulai server setelah database siap
const startServer = async () => {
  try {
    // Coba hubungkan ke database
    // await sequelize.authenticate();
    // console.log('✅ Koneksi database berhasil.');

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
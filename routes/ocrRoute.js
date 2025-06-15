// Di dalam file: routes/route.js

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const AppError = require('../utils/appError');

const ocrController = require('../controllers/ocrController');
const router = express.Router();

// --- Konfigurasi Multer (tidak ada perubahan) ---
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
    try {
        fs.mkdirSync(UPLOADS_DIR, { recursive: true });
        console.log(`Folder uploads berhasil dibuat di: ${UPLOADS_DIR}`);
    } catch (err) {
        console.error(`Gagal membuat folder uploads di: ${UPLOADS_DIR}`, err);
    }
}
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOADS_DIR),
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const extension = path.extname(file.originalname);
        cb(null, 'invoice-' + uniqueSuffix + extension);
    }
});
const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
        cb(null, true);
    } else {
        cb(new AppError('Tipe file tidak didukung! Hanya gambar dan PDF yang diizinkan.', 400), false);
    }
};
const upload = multer({
    storage: storage,
    limits: { fileSize: 15 * 1024 * 1024 },
    fileFilter: fileFilter
});
// --- Akhir Konfigurasi Multer ---


// =======================================================
// ===     RUTE-RUTE CRUD (Create, Read, Update, Delete) ===
// =======================================================

// --- CREATE (C) ---
// Endpoint untuk memproses file dan mendapatkan JSON hasil OCR.
router.post('/process-ocr',  upload.array('documentFiles', 10), ocrController.processOcrOnly);




module.exports = router;
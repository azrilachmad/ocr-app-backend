const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const AppError = require('../utils/appError');
const ocrController = require('../controllers/ocrController'); 
const router = express.Router();

// --- Konfigurasi Multer
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
        cb(null, 'doc-' + uniqueSuffix + extension);
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

// =======================================================
// ===               Route List              ===
// =======================================================

// --- CREATE (C) ---
// 1. Endpoint terpadu untuk memproses OCR
router.post(
    '/process', 
    upload.array('documentFiles', 10), // Menggunakan .array() untuk multi-file
    ocrController.processOcrOnly
);

// Rute untuk UploadedFile
router.post(
    '/submit',
    upload.array('documentFiles', 10), // Mengharapkan BANYAK file dengan field 'documentFiles'
    ocrController.submitData
);

// 2. Endpoint untuk menyimpan data hasil OCR
router.post('/submit', ocrController.submitData);


// --- READ (UNTUK DATATABLE & DETAIL) ---
// Rute untuk Invoice
router.get('/invoices', ocrController.getAllInvoices);
router.get('/invoices/:id', ocrController.getInvoiceById);

// Rute untuk STNK
router.get('/stnks', ocrController.getAllStnks);
router.get('/stnks/:id', ocrController.getStnkById);

// Rute untuk BPKB
router.get('/bpkbs', ocrController.getAllBpkbs);
router.get('/bpkbs/:id', ocrController.getBpkbById);



module.exports = router;
// OCR-APP-BACKEND/routes/upload.js
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const { ocrInvoiceController } = require('../controllers/invoiceController');

const router = express.Router();
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
    destination: function (req, file, cb) {
        cb(null, UPLOADS_DIR);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const extension = path.extname(file.originalname);
        cb(null, file.fieldname + '-' + uniqueSuffix + extension);
    }
});

const fileFilter = (req, file, cb) => {
    if (
        file.mimetype === 'image/jpeg' ||
        file.mimetype === 'image/png' ||
        file.mimetype === 'image/bmp' ||
        file.mimetype === 'image/tiff' ||
        file.mimetype === 'application/pdf'
    ) {
        cb(null, true);
    } else {
        // Bisa juga melempar AppError di sini agar ditangani oleh global error handler
        // cb(new AppError('Tipe file tidak didukung! Hanya gambar (JPG, PNG, BMP, TIFF) dan PDF yang diizinkan.', 400), false);
        cb(new Error('Tipe file tidak didukung! Hanya gambar (JPG, PNG, BMP, TIFF) dan PDF yang diizinkan.'), false);
    }
};

const upload = multer({
    storage: storage,
    limits: { fileSize: 15 * 1024 * 1024 },
    fileFilter: fileFilter
});

router.post('/process', upload.single('invoiceImageFile'), ocrInvoiceController);

module.exports = router;
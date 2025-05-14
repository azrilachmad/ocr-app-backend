// OCR-APP-BACKEND/utils/tesseractService.js
const Tesseract = require('tesseract.js');
const path = require('path');

async function runOcrWithTesseract(imagePath, lang) {
    const effectiveLang = lang || 'eng';
    console.log(`Memulai Tesseract.js worker untuk bahasa: ${effectiveLang} pada file: ${path.basename(imagePath)}`);
    let worker;
    try {
        worker = await Tesseract.createWorker(effectiveLang, Tesseract.OEM.LSTM_ONLY, {
            // logger: m => console.log(m.status, m.progress),
        });
        const { data: { text } } = await worker.recognize(imagePath);
        console.log(`Tesseract.js OCR selesai untuk file: ${path.basename(imagePath)}.`);
        return text;
    } catch (error) {
        console.error(`Error selama Tesseract.js OCR (bahasa: ${effectiveLang}, file: ${path.basename(imagePath)}):`, error.message || error);
        // Lempar error agar bisa ditangkap oleh catchAsync di controller
        throw new Error(`Tesseract.js OCR gagal: ${error.message || 'Unknown Tesseract error'}`);
    } finally {
        if (worker) {
            await worker.terminate();
            console.log(`Tesseract.js worker (bahasa: ${effectiveLang}) dihentikan setelah memproses ${path.basename(imagePath)}.`);
        }
    }
}
module.exports = { runOcrWithTesseract };
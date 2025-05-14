// OCR-APP-BACKEND/utils/appError.js (atau misal /errors/appError.js)
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error'; // 'fail' untuk 4xx, 'error' untuk 5xx
    this.isOperational = true; // Menandai error ini sebagai error operasional yang bisa diprediksi

    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
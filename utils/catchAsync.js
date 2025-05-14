// OCR-APP-BACKEND/utils/catchAsync.js
const catchAsync = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next); // Otomatis menangkap error dari promise dan meneruskannya ke 'next'
  };
};

module.exports = catchAsync;
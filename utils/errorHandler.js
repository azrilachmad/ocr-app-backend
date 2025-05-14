const AppError = require('./appError');

const globalErrorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // Multer error (upload file)
  if (err.name === 'MulterError') {
    return res.status(400).json({
      status: 'Failed',
      message: err.message,
    });
  }

  // Custom file validation error
  if (err.message && err.message.includes('Hanya file')) {
    return res.status(400).json({
      status: 'Failed',
      message: err.message,
    });
  }

  // AppError (custom error)
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
    });
  }

  // Default: Internal server error
  return res.status(500).json({
    status: 'Error',
    message: 'Something went wrong',
    error: err.message,
  });
};

module.exports = globalErrorHandler;

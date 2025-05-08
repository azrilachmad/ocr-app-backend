const AppError = require("../utils/appError");

const sendErrorDev = (error, res) => {
    const statusCode = error.statusCode || 500;
    const status = error.status || 'error';
    const message = error.message;
    const stack = error.stack;

    res.status(statusCode).json({
        status,
        message,
        stack,  // Only send this in dev
    });
};

const sendErrorProd = (error, res) => {
    const statusCode = error.statusCode || 500;
    const status = error.status || 'error';
    const message = error.message;

    // Operational errors are errors we know about (like validation errors)
    if (error.isOperational) {
        return res.status(statusCode).json({
            status,
            message,
        });
    }

    // For programming or other unknown errors, log them and send a generic message
    console.error(error);
    return res.status(500).json({
        status: 'error',
        message: 'Something went wrong!',
    });
};

const globalErrorHandler = (err, req, res, next) => {
    if (err.name === 'JsonWebTokenError') {
        err = new AppError('Invalid Token', 401);
    }

    if (err.name === 'SequelizeValidationError') {
        err = new AppError(err.errors[0].message, 400);
    }

    if (err.name === 'SequelizeUniqueConstraintError') {
        err = new AppError(err.errors[0].message, 400);
    }

    if (err.name === 'ValidationError') {
        // Handle express-validator validation errors
        const message = err.errors.map(error => error.msg).join('. ');
        err = new AppError(message, 400);
    }

    // In the development environment, send detailed error info
    if (process.env.NODE_ENV === 'development') {
        return sendErrorDev(err, res);
    }

    // In production, send less detailed error info to the client
    sendErrorProd(err, res);
};

module.exports = globalErrorHandler;

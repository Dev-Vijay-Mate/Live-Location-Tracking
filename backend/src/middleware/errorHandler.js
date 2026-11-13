/**
 * Centralized Error-Handling Middleware
 * Provides uniform error formatting and graceful 404 handling.
 */

class AppError extends Error {
  constructor(message, statusCode = 500, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Catches routes that did not match any registered endpoints
 */
function notFoundHandler(req, res, next) {
  const error = new AppError(`Endpoint not found: ${req.method} ${req.originalUrl}`, 404);
  next(error);
}

/**
 * Global error-handling middleware
 * Must have 4 parameters (err, req, res, next) for Express to recognize it as an error handler.
 */
function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  // Handle invalid JSON syntax in request body
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Malformed JSON payload in request body',
        status: 400,
      },
    });
  }

  const statusCode = err.statusCode || (err.status && typeof err.status === 'number' ? err.status : 500);
  const isProduction = process.env.NODE_ENV === 'production';

  const response = {
    success: false,
    error: {
      message: err.message || 'Internal Server Error',
      status: statusCode,
      ...(err.details ? { details: err.details } : {}),
      ...(!isProduction && statusCode === 500 ? { stack: err.stack } : {}),
    },
  };

  // Log unexpected 500 errors to console for debugging
  if (statusCode >= 500) {
    console.error(`[ERROR] ${req.method} ${req.originalUrl}:`, err);
  }

  res.status(statusCode).json(response);
}

module.exports = {
  AppError,
  notFoundHandler,
  errorHandler,
};


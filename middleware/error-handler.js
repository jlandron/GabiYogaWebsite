/**
 * Error Handling Middleware for Express
 * 
 * This file provides centralized error handling for the Express server.
 */

const { sendError } = require('../utils/api-response');
const logger = require('../utils/logger');

/**
 * Global error handler middleware
 * Catches any unhandled errors and sends a formatted response
 */
const errorHandler = (err, req, res, next) => {
  // Log the error with request context
  const meta = {
    path: req.originalUrl,
    method: req.method,
    requestId: req.requestId || 'unknown'
  };
  
  // Use Winston's error method that properly handles Error objects
  logger.error('Unhandled error in request processing', {
    ...meta,
    error: err.message,
    stack: err.stack
  });
  
  // Determine status code
  const statusCode = err.statusCode || 500;
  
  // Create error message
  const message = err.message || 'An unexpected error occurred';
  
  // Return formatted error response
  return sendError(res, message, err, statusCode);
};

/**
 * 404 Not Found handler for unknown routes
 */
const notFoundHandler = (req, res, next) => {
  // Log the 404 error with Winston
  logger.warn(`Resource not found: ${req.originalUrl}`, {
    path: req.originalUrl,
    method: req.method,
    requestId: req.requestId || 'unknown',
    statusCode: 404
  });
  
  return sendError(
    res, 
    `Resource not found: ${req.originalUrl}`, 
    null, 
    404
  );
};

module.exports = {
  errorHandler,
  notFoundHandler
};

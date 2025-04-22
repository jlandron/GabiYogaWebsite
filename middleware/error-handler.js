/**
 * Error Handling Middleware for Express
 * 
 * This file provides centralized error handling for the Express server.
 */

const { sendError } = require('../utils/api-response');

/**
 * Global error handler middleware
 * Catches any unhandled errors and sends a formatted response
 */
const errorHandler = (err, req, res, next) => {
  // Log the error for debugging
  console.error('Unhandled error:', err);
  
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

/**
 * API Response Utilities
 * 
 * This file provides standardized response formatting for API endpoints
 * to ensure consistent response structure across the application.
 */

/**
 * Send a successful response
 * 
 * @param {object} res - Express response object
 * @param {object} data - Data to include in the response
 * @param {string} message - Optional success message
 * @param {number} statusCode - HTTP status code (default: 200)
 */
const sendSuccess = (res, data = {}, message = 'Operation successful', statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    ...data
  });
};

/**
 * Send an error response
 * 
 * @param {object} res - Express response object
 * @param {string} message - Error message
 * @param {Error} error - Error object (optional)
 * @param {number} statusCode - HTTP status code (default: 500)
 */
const sendError = (res, message = 'An error occurred', error = null, statusCode = 500) => {
  const response = {
    success: false,
    message
  };
  
  // Include error details if in development mode
  if (process.env.NODE_ENV === 'development' && error) {
    response.error = error.message || String(error);
  }
  
  return res.status(statusCode).json(response);
};

/**
 * Handle API errors with consistent logging and response
 * 
 * @param {Function} routeHandler - Async route handler function
 * @returns {Function} - Express middleware function
 */
const asyncHandler = (routeHandler) => {
  return async (req, res, next) => {
    try {
      await routeHandler(req, res, next);
    } catch (error) {
      console.error(`API Error: ${error.message}`, error);
      sendError(res, 'An unexpected error occurred', error);
    }
  };
};

/**
 * Create not found handler
 * 
 * @param {string} resourceName - Name of the resource (e.g., 'User', 'Workshop')
 * @returns {Function} - Handler function that sends appropriate response
 */
const notFound = (resourceName) => {
  return (res) => sendError(res, `${resourceName} not found`, null, 404);
};

module.exports = {
  sendSuccess,
  sendError,
  asyncHandler,
  notFound
};

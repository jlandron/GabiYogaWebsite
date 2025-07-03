/**
 * Lightweight utilities for static website Lambda
 * Only includes functions needed for serving static content
 */

/**
 * Create Lambda response
 */
function createResponse(statusCode, body, headers = {}) {
  const defaultHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': process.env.CORS_ORIGIN || '*',
    'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Amz-Date, X-Api-Key, X-Amz-Security-Token'
  };

  return {
    statusCode,
    headers: { ...defaultHeaders, ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body)
  };
}

/**
 * Create success response
 */
function createSuccessResponse(data, statusCode = 200) {
  return createResponse(statusCode, {
    success: true,
    ...data
  });
}

/**
 * Create error response
 */
function createErrorResponse(message, statusCode = 400, details = null) {
  const body = {
    success: false,
    message
  };

  if (details) {
    body.details = details;
  }

  return createResponse(statusCode, body);
}

/**
 * Log with context
 */
function logWithContext(level, message, context = {}) {
  const logData = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...context
  };
  
  console[level] = console[level] || console.log;
  console[level](JSON.stringify(logData));
}

module.exports = {
  createResponse,
  createSuccessResponse,
  createErrorResponse,
  logWithContext};

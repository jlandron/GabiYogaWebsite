/**
 * Unit tests for error-handler.js middleware
 * 
 * Tests the error handling and not found middleware functions
 */

// Mock the dependencies
jest.mock('../../utils/api-response', () => ({
  sendError: jest.fn((res, message, error, statusCode) => res.status(statusCode).json({
    success: false,
    message,
    error: error ? error.toString() : null
  }))
}));

jest.mock('../../utils/logger', () => ({
  error: jest.fn(),
  warn: jest.fn()
}));

// Import the mocked dependencies to use in assertions
const { sendError } = require('../../utils/api-response');
const logger = require('../../utils/logger');

// Import the middleware to test
const { errorHandler, notFoundHandler } = require('../../middleware/error-handler');

describe('Error Handler Middleware', () => {
  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  describe('errorHandler', () => {
    it('should handle errors with custom statusCode', () => {
      // Arrange
      const err = {
        statusCode: 400,
        message: 'Bad request',
        stack: 'Error stack'
      };
      
      const req = {
        originalUrl: '/api/test',
        method: 'GET',
        requestId: 'test-request-id'
      };
      
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      
      const next = jest.fn();
      
      // Act
      errorHandler(err, req, res, next);
      
      // Assert
      expect(logger.error).toHaveBeenCalledWith('Unhandled error in request processing', {
        path: '/api/test',
        method: 'GET',
        requestId: 'test-request-id',
        error: 'Bad request',
        stack: 'Error stack'
      });
      
      expect(sendError).toHaveBeenCalledWith(res, 'Bad request', err, 400);
    });
    
    it('should use 500 status code for errors without statusCode', () => {
      // Arrange
      const err = {
        message: 'Server error',
        stack: 'Error stack'
      };
      
      const req = {
        originalUrl: '/api/test',
        method: 'POST',
        requestId: 'test-request-id'
      };
      
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      
      const next = jest.fn();
      
      // Act
      errorHandler(err, req, res, next);
      
      // Assert
      expect(sendError).toHaveBeenCalledWith(res, 'Server error', err, 500);
    });
    
    it('should use default error message if none provided', () => {
      // Arrange
      const err = {
        stack: 'Error stack'
      };
      
      const req = {
        originalUrl: '/api/test',
        method: 'DELETE',
        requestId: undefined
      };
      
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      
      const next = jest.fn();
      
      // Act
      errorHandler(err, req, res, next);
      
      // Assert
      expect(logger.error).toHaveBeenCalledWith('Unhandled error in request processing', {
        path: '/api/test',
        method: 'DELETE',
        requestId: 'unknown',
        error: undefined,
        stack: 'Error stack'
      });
      
      expect(sendError).toHaveBeenCalledWith(res, 'An unexpected error occurred', err, 500);
    });
    
    it('should handle Error objects', () => {
      // Arrange
      const err = new Error('Runtime error');
      
      const req = {
        originalUrl: '/api/test',
        method: 'PUT',
        requestId: 'test-request-id'
      };
      
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      
      const next = jest.fn();
      
      // Act
      errorHandler(err, req, res, next);
      
      // Assert
      expect(logger.error).toHaveBeenCalled();
      expect(sendError).toHaveBeenCalledWith(res, 'Runtime error', err, 500);
    });
  });
  
  describe('notFoundHandler', () => {
    it('should handle 404 errors and log them', () => {
      // Arrange
      const req = {
        originalUrl: '/api/nonexistent',
        method: 'GET',
        requestId: 'test-request-id'
      };
      
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      
      const next = jest.fn();
      
      // Act
      notFoundHandler(req, res, next);
      
      // Assert
      expect(logger.warn).toHaveBeenCalledWith('Resource not found: /api/nonexistent', {
        path: '/api/nonexistent',
        method: 'GET',
        requestId: 'test-request-id',
        statusCode: 404
      });
      
      expect(sendError).toHaveBeenCalledWith(
        res, 
        'Resource not found: /api/nonexistent', 
        null, 
        404
      );
    });
    
    it('should use unknown requestId if not provided', () => {
      // Arrange
      const req = {
        originalUrl: '/api/nonexistent',
        method: 'GET'
        // No requestId
      };
      
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      
      const next = jest.fn();
      
      // Act
      notFoundHandler(req, res, next);
      
      // Assert
      expect(logger.warn).toHaveBeenCalledWith('Resource not found: /api/nonexistent', {
        path: '/api/nonexistent',
        method: 'GET',
        requestId: 'unknown',
        statusCode: 404
      });
    });
  });
});

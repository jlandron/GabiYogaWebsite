/**
 * Unit tests for logger.js
 * 
 * Tests the Winston logger configuration and request logger middleware
 */

// Mock dependencies
jest.mock('winston', () => {
  const mockFormat = {
    combine: jest.fn().mockReturnThis(),
    timestamp: jest.fn().mockReturnThis(),
    errors: jest.fn().mockReturnThis(),
    metadata: jest.fn().mockReturnThis(),
    printf: jest.fn().mockReturnThis(),
    colorize: jest.fn().mockReturnThis()
  };
  
  const mockTransports = {
    Console: jest.fn(),
    File: jest.fn()
  };
  
  const mockLogger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    http: jest.fn(),
    add: jest.fn()
  };
  
  return {
    format: mockFormat,
    transports: mockTransports,
    createLogger: jest.fn().mockReturnValue(mockLogger),
    addColors: jest.fn()
  };
});

jest.mock('winston-daily-rotate-file', () => 
  jest.fn().mockImplementation(() => ({
    name: 'dailyRotateFile'
  }))
);

jest.mock('fs', () => ({
  existsSync: jest.fn().mockReturnValue(true),
  mkdirSync: jest.fn()
}));

jest.mock('path', () => ({
  join: jest.fn((...args) => args.join('/'))
}));

jest.mock('os', () => ({
  hostname: jest.fn().mockReturnValue('test-host')
}));

// Import the mocks to use in tests
const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const fs = require('fs');
const path = require('path');
const os = require('os');

describe('Logger', () => {
  // Save original environment variables
  const originalNodeEnv = process.env.NODE_ENV;
  const originalLogLevel = process.env.LOG_LEVEL;
  
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NODE_ENV = 'test';
    delete process.env.LOG_LEVEL;
  });
  
  afterEach(() => {
    // Restore environment variables
    process.env.NODE_ENV = originalNodeEnv;
    if (originalLogLevel) {
      process.env.LOG_LEVEL = originalLogLevel;
    } else {
      delete process.env.LOG_LEVEL;
    }
  });
  
  describe('Logger Configuration', () => {
    beforeEach(() => {
      // Clear require cache and re-mock all dependencies
      jest.resetModules();
      jest.mock('winston', () => {
        const mockFormat = {
          combine: jest.fn().mockReturnThis(),
          timestamp: jest.fn().mockReturnThis(),
          errors: jest.fn().mockReturnThis(),
          metadata: jest.fn().mockReturnThis(),
          printf: jest.fn().mockReturnThis(),
          colorize: jest.fn().mockReturnThis()
        };
        
        const mockTransports = {
          Console: jest.fn(),
          File: jest.fn()
        };
        
        const mockLogger = {
          info: jest.fn(),
          warn: jest.fn(),
          error: jest.fn(),
          debug: jest.fn(),
          http: jest.fn(),
          add: jest.fn()
        };
        
        return {
          format: mockFormat,
          transports: mockTransports,
          createLogger: jest.fn().mockReturnValue(mockLogger),
          addColors: jest.fn()
        };
      });
      
      jest.mock('winston-daily-rotate-file', () => 
        jest.fn().mockImplementation(() => ({
          name: 'dailyRotateFile'
        }))
      );
      
      jest.mock('fs', () => ({
        existsSync: jest.fn().mockReturnValue(true),
        mkdirSync: jest.fn()
      }));
    });

    it('should create log directory if it does not exist', () => {
      // Arrange
      const fs = require('fs');
      fs.existsSync.mockReturnValueOnce(false);
      
      // Act - importing logger will execute the configuration code
      const logger = require('../../utils/logger');
      
      // Assert
      expect(fs.existsSync).toHaveBeenCalled();
      expect(fs.mkdirSync).toHaveBeenCalled();
      expect(fs.mkdirSync).toHaveBeenCalledWith(expect.any(String), { recursive: true });
    });
    
    it('should not create log directory if it exists', () => {
      // Arrange
      const fs = require('fs');
      fs.existsSync.mockReturnValueOnce(true);
      
      // Act - importing logger will execute the configuration code
      const logger = require('../../utils/logger');
      
      // Assert
      expect(fs.existsSync).toHaveBeenCalled();
      expect(fs.mkdirSync).not.toHaveBeenCalled();
    });
    
    it('should configure Winston logger with transports', () => {
      // Arrange & Act
      const winston = require('winston');
      const DailyRotateFile = require('winston-daily-rotate-file');
      const logger = require('../../utils/logger');
      
      // Assert
      expect(winston.createLogger).toHaveBeenCalled();
      expect(winston.createLogger).toHaveBeenCalledWith(expect.objectContaining({
        format: expect.anything(),
        defaultMeta: expect.objectContaining({
          service: 'yoga-website',
          environment: 'test'
        }),
        transports: expect.any(Array)
      }));
      
      // Should have Console transport
      expect(winston.transports.Console).toHaveBeenCalled();
      
      // Should have DailyRotateFile transports
      expect(DailyRotateFile).toHaveBeenCalledTimes(3);
    });
    
    it('should use LOG_LEVEL from environment when available', () => {
      // Arrange
      process.env.LOG_LEVEL = 'debug';
      
      // Act
      const winston = require('winston');
      const logger = require('../../utils/logger');
      
      // Assert
      expect(winston.createLogger).toHaveBeenCalledWith(
        expect.objectContaining({
          level: 'debug'
        })
      );
    });
    
    it('should set log level based on NODE_ENV when LOG_LEVEL is not available', () => {
      // Arrange
      process.env.NODE_ENV = 'production';
      delete process.env.LOG_LEVEL;
      
      // Act
      const winston = require('winston');
      const logger = require('../../utils/logger');
      
      // Assert
      expect(winston.createLogger).toHaveBeenCalledWith(
        expect.objectContaining({
          level: 'info'
        })
      );
      
      // Reset and re-mock for development environment test
      jest.resetModules();
      process.env.NODE_ENV = 'development';
      delete process.env.LOG_LEVEL;
      
      jest.mock('winston', () => {
        return {
          format: {
            combine: jest.fn().mockReturnThis(),
            timestamp: jest.fn().mockReturnThis(),
            errors: jest.fn().mockReturnThis(),
            metadata: jest.fn().mockReturnThis(),
            printf: jest.fn().mockReturnThis(),
            colorize: jest.fn().mockReturnThis()
          },
          transports: {
            Console: jest.fn(),
            File: jest.fn()
          },
          createLogger: jest.fn().mockReturnValue({
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
            debug: jest.fn(),
            http: jest.fn(),
            add: jest.fn()
          }),
          addColors: jest.fn()
        };
      });
      
      const devWinston = require('winston');
      const devLogger = require('../../utils/logger');
      
      expect(devWinston.createLogger).toHaveBeenCalledWith(
        expect.objectContaining({
          level: 'debug'
        })
      );
    });
  });
  
  describe('Request Logger Middleware', () => {
    let logger;
    let req;
    let res;
    let next;
    
    beforeEach(() => {
      jest.resetModules();
      logger = require('../../utils/logger');
      
      // Mock request object
      req = {
        method: 'GET',
        originalUrl: '/api/test',
        ip: '127.0.0.1',
        headers: {
          'user-agent': 'Jest Test'
        },
        connection: {
          remoteAddress: '127.0.0.1'
        }
      };
      
      // Mock response object
      res = {
        statusCode: 200,
        on: jest.fn((event, callback) => {
          if (event === 'finish') {
            // Store callback to execute it in tests
            res.finishCallback = callback;
          }
        })
      };
      
      next = jest.fn();
      
      // Reset mocked logger methods
      logger.info.mockClear();
      logger.warn.mockClear();
      logger.error.mockClear();
      logger.http.mockClear();
    });
    
    it('should add requestId to request object', () => {
      // Act
      logger.requestLogger(req, res, next);
      
      // Assert
      expect(req.requestId).toBeDefined();
      expect(next).toHaveBeenCalled();
    });
    
    it('should log incoming requests', () => {
      // Act
      logger.requestLogger(req, res, next);
      
      // Assert
      expect(logger.info).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith(
        'Request received: GET /api/test',
        expect.objectContaining({
          requestId: req.requestId,
          method: 'GET',
          url: '/api/test',
          ip: '127.0.0.1',
          userAgent: 'Jest Test'
        })
      );
    });
    
    it('should log completed requests with appropriate level based on status code', () => {
      // Arrange
      logger.requestLogger(req, res, next);
      
      // Act - Simulate response finish event with different status codes
      
      // Success response
      res.statusCode = 200;
      res.finishCallback();
      
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Request completed: GET /api/test - 200'),
        expect.objectContaining({
          statusCode: 200
        })
      );
      
      // Client error response
      res.statusCode = 404;
      res.finishCallback();
      
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Request completed: GET /api/test - 404'),
        expect.objectContaining({
          statusCode: 404
        })
      );
      
      // Server error response
      res.statusCode = 500;
      res.finishCallback();
      
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Request completed: GET /api/test - 500'),
        expect.objectContaining({
          statusCode: 500
        })
      );
    });
    
    it('should create HTTP access log entry', () => {
      // Arrange
      logger.requestLogger(req, res, next);
      
      // Act
      res.finishCallback();
      
      // Assert
      expect(logger.http).toHaveBeenCalledWith(
        expect.stringContaining('"GET /api/test" 200'),
        expect.objectContaining({
          requestId: req.requestId
        })
      );
    });
    
    it('should skip logging for health check endpoints', () => {
      // Arrange
      req.originalUrl = '/api/health';
      logger.requestLogger(req, res, next);
      
      // Act
      res.finishCallback();
      
      // Assert - Should not log the request or response for health checks
      expect(logger.info).not.toHaveBeenCalledWith(
        expect.stringContaining('Request received'),
        expect.anything()
      );
      
      expect(logger.info).not.toHaveBeenCalledWith(
        expect.stringContaining('Request completed'),
        expect.anything()
      );
      
      expect(logger.http).not.toHaveBeenCalled();
    });
  });
});

/**
 * Winston Logger Configuration
 * 
 * This module configures the Winston logger with:
 * - Console transport for development visibility
 * - DailyRotateFile transport for log rotation to manage disk space
 * - Custom formatting with timestamps and contextual information
 */

const winston = require('winston');
const { createLogger, format, transports } = winston;
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Set up log directory
const LOG_DIR = process.env.NODE_ENV === 'production' 
  ? '/var/log/yoga-website' 
  : path.join(__dirname, '..', 'logs');

// Ensure log directory exists
if (!fs.existsSync(LOG_DIR)) {
  try {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  } catch (err) {
    console.error(`Failed to create log directory at ${LOG_DIR}:`, err);
  }
}

// Configure the log format
const logFormat = format.combine(
  format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  format.errors({ stack: true }),
  format.metadata({ fillExcept: ['timestamp', 'level', 'message'] }),
  format.printf(info => {
    const { timestamp, level, message, metadata } = info;
    const hostname = os.hostname();
    
    // Include metadata if it has properties other than stack trace
    let metaString = '';
    if (metadata && Object.keys(metadata).length > 0) {
      // Handle error objects specially to extract stack trace
      if (metadata.stack) {
        metaString = `\n${metadata.stack}`;
      } else {
        try {
          metaString = ' ' + JSON.stringify(metadata);
        } catch (err) {
          metaString = ' [Error serializing metadata]';
        }
      }
    }
    
    return `${timestamp} ${level.toUpperCase()} [${hostname}] ${message}${metaString}`;
  })
);

// Configure file rotation options (shared settings)
const rotationOptions = {
  datePattern: 'YYYY-MM-DD-HH',  // Rotate every hour
  maxSize: '10m',                // Max 10MB per file
  maxFiles: '3d',                // Keep logs for 3 days
  zippedArchive: false,          // Don't compress archived logs
  auditFile: path.join(LOG_DIR, '.winston-audit.json')
};

// Create the Winston logger instance
const logger = createLogger({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  format: logFormat,
  defaultMeta: {
    service: 'yoga-website',
    environment: process.env.NODE_ENV || 'development'
  },
  transports: [
    // Always log to the console
    new transports.Console({
      format: format.combine(
        format.colorize(),
        logFormat
      )
    }),
    
    // Log everything to application log with rotation
    new DailyRotateFile({
      ...rotationOptions,
      filename: path.join(LOG_DIR, 'app-%DATE%.log')
    }),
    
    // Log errors and warnings to a separate error log
    new DailyRotateFile({
      ...rotationOptions,
      filename: path.join(LOG_DIR, 'error-%DATE%.log'),
      level: 'warn' // Only log warnings and errors
    }),
  ],
  exitOnError: false
});

// Create HTTP request logger middleware
const requestLogger = (req, res, next) => {
  const start = Date.now();
  const requestId = Math.random().toString(36).substring(2, 15);
  
  // Add request ID to the request object for tracking 
  req.requestId = requestId;
  
  // Check if this is a health check request
  const isHealthCheck = req.originalUrl === '/api/health';
  
  // Log the incoming request (skip health checks)
  if (!isHealthCheck) {
    logger.info(`Request received: ${req.method} ${req.originalUrl}`, {
      requestId,
      method: req.method,
      url: req.originalUrl,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent']
    });
  }
  
  // Capture response data when finished
  res.on('finish', () => {
    const duration = Date.now() - start;
    
    // Skip logging health check responses
    if (isHealthCheck) {
      return; 
    }
    
    const logData = {
      requestId,
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration: `${duration}ms`
    };
    
    // Log at appropriate level based on status code
    if (res.statusCode >= 500) {
      logger.error(`Request completed: ${req.method} ${req.originalUrl} - ${res.statusCode}`, logData);
    } else if (res.statusCode >= 400) {
      logger.warn(`Request completed: ${req.method} ${req.originalUrl} - ${res.statusCode}`, logData);
    } else {
      logger.info(`Request completed: ${req.method} ${req.originalUrl} - ${res.statusCode}`, logData);
    }
    
    // Create HTTP access log-style entry in a separate transport (skip health checks)
    logger.http(`${req.ip} - - [${new Date().toISOString()}] "${req.method} ${req.originalUrl}" ${res.statusCode} ${duration}ms "${req.headers['user-agent']}"`, {
      requestId
    });
  });
  
  next();
};

// Add the middleware to the logger object
logger.requestLogger = requestLogger;

// Create a separate access log transport (similar to Apache/Nginx access logs)
const accessLogTransport = new DailyRotateFile({
  ...rotationOptions,
  filename: path.join(LOG_DIR, 'access-%DATE%.log'),
  level: 'http'
});

logger.add(accessLogTransport);

module.exports = logger;

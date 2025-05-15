/**
 * Setup file for Jest tests
 * 
 * This file is run before each test suite to set up the environment
 */

// Load environment variables for testing
require('dotenv').config({
  path: process.env.ENV_FILE || '.env'
});

// Set test environment variables that are needed but might not be in the .env file
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-for-unit-tests';
process.env.PORT = process.env.PORT || 5001;

// Suppress console logs during testing unless explicitly enabled
if (process.env.TEST_LOGS !== 'true') {
  global.console = {
    ...console,
    log: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    // Keep error logs for debugging test failures
    error: console.error
  };
}

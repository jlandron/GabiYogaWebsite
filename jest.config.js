/**
 * Jest configuration file
 * 
 * This file configures Jest for both unit and integration tests
 */

module.exports = {
  // Use the setup file for all tests
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  
  // Define test environment
  testEnvironment: 'node',
  
  // Setup environment for DOM tests
  moduleNameMapper: {
    // Add any module mappings if needed
  },
  
  // Only run unit and integration tests (exclude DOM tests)
  testMatch: [
    '<rootDir>/tests/unit/**/*.test.js', 
    '<rootDir>/tests/integration/**/*.test.js'
  ],
  
  // Explicitly exclude the DOM tests directory
  testPathIgnorePatterns: [
    '<rootDir>/tests/dom'
  ],
  
  // Override environment for DOM tests
  testEnvironmentOptions: {
    // DOM specific options
  },
  
  // Coverage settings
  collectCoverageFrom: [
    'utils/**/*.js',
    'middleware/**/*.js',
    'js/**/*.js',
    'api/**/*.js',
    '!**/node_modules/**',
    '!**/vendor/**'
  ],
  
  // Coverage thresholds - can be adjusted as needed
  coverageThreshold: {
    global: {
      statements: 70,
      branches: 70,
      functions: 70,
      lines: 70
    }
  },
  
  // Test timeouts - increase for integration tests
  testTimeout: 10000,
  
  // Various reporting options
  verbose: true,
  
  // Don't watch for file changes by default (can be overridden with --watch)
  watch: false,
  
  // Custom reporters if needed
  reporters: ['default'],
  
  // Transform settings if needed
  transform: {}
};

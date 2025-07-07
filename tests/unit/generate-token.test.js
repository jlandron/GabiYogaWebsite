/**
 * Unit tests for generate-token.js
 * 
 * Tests the JWT token generation utility
 */

// Mock dependencies
// Clear the require cache to ensure module imports are fresh for each test
beforeEach(() => {
  jest.resetModules();
});

// Save original process.argv, process.exit, and console methods
const originalArgv = process.argv;
const originalExit = process.exit;
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

// Global mocks
jest.mock('jsonwebtoken', () => ({
  sign: jest.fn().mockReturnValue('mock-jwt-token'),
  decode: jest.fn().mockReturnValue({
    id: 'test-id',
    email: 'test@example.com',
    role: 'test-role',
    exp: Math.floor(Date.now() / 1000) + 3600 // Current time + 1 hour
  })
}));

jest.mock('dotenv', () => ({
  config: jest.fn()
}));

jest.mock('fs', () => ({
  existsSync: jest.fn().mockReturnValue(true)
}));

jest.mock('path', () => ({
  join: jest.fn((...args) => args.join('/'))
}));

describe('Generate Token Utility', () => {
  // Set up environment and mocks before each test
  beforeEach(() => {
    // Mock process.argv
    process.argv = ['node', 'generate-token.js'];
    
    // Mock process.exit
    process.exit = jest.fn();
    
    // Mock console methods
    console.log = jest.fn();
    console.error = jest.fn();
    console.warn = jest.fn();
    
    // Set up environment variables
    process.env.JWT_SECRET = 'test-secret';
    process.env.JWT_EXPIRY = '24h';
    
    // Clear all mocks
    jest.clearAllMocks();
  });
  
  // Restore original functions after each test
  afterEach(() => {
    process.argv = originalArgv;
    process.exit = originalExit;
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
    console.warn = originalConsoleWarn;
  });
  
  it('should generate token with valid parameters', () => {
    // Arrange
    process.argv = [
      'node', 
      'generate-token.js', 
      '--id', 'test-id', 
      '--email', 'test@example.com', 
      '--role', 'admin'
    ];
    
    // Import jwt for test assertions
    const jwt = require('jsonwebtoken');
    
    // Act
    require('../../utils/generate-token');
    
    // Assert
    expect(jwt.sign).toHaveBeenCalledWith(
      {
        id: 'test-id',
        email: 'test@example.com',
        role: 'admin'
      },
      'test-secret',
      { expiresIn: '24h' }
    );
    
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('JWT Token Generated Successfully'));
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('mock-jwt-token'));
    expect(process.exit).not.toHaveBeenCalled();
  });
  
  it('should use custom expiry if provided', () => {
    // Arrange
    process.argv = [
      'node', 
      'generate-token.js', 
      '--id', 'test-id', 
      '--email', 'test@example.com', 
      '--role', 'admin',
      '--expiry', '7d'
    ];
    
    // Import jwt for test assertions
    const jwt = require('jsonwebtoken');
    
    // Act
    require('../../utils/generate-token');
    
    // Assert
    expect(jwt.sign).toHaveBeenCalledWith(
      {
        id: 'test-id',
        email: 'test@example.com',
        role: 'admin'
      },
      'test-secret',
      { expiresIn: '7d' }
    );
  });
  
  it('should use custom secret if provided', () => {
    // Arrange
    process.argv = [
      'node', 
      'generate-token.js', 
      '--id', 'test-id', 
      '--email', 'test@example.com', 
      '--role', 'admin',
      '--secret', 'custom-secret'
    ];
    
    // Import jwt for test assertions
    const jwt = require('jsonwebtoken');
    
    // Act
    require('../../utils/generate-token');
    
    // Assert
    expect(jwt.sign).toHaveBeenCalledWith(
      expect.any(Object),
      'custom-secret',
      expect.any(Object)
    );
    
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('Using custom JWT secret'));
  });
  
  it('should exit with error if JWT_SECRET is not set', () => {
    // Arrange
    // Reset the module cache before this test
    jest.resetModules();
    
    // Create a fresh mock for JWT
    jest.mock('jsonwebtoken', () => ({
      sign: jest.fn(),
      decode: jest.fn()
    }));
    
    // Remove the environment variable for this test
    delete process.env.JWT_SECRET;
    
    process.argv = [
      'node', 
      'generate-token.js', 
      '--id', 'test-id', 
      '--email', 'test@example.com', 
      '--role', 'admin'
    ];
    
    // Import the mocked jwt for assertion
    const jwt = require('jsonwebtoken');
    
    // Act
    require('../../utils/generate-token');
    
    // Assert
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('JWT_SECRET environment variable is not set'));
    expect(process.exit).toHaveBeenCalledWith(1);
    expect(jwt.sign).not.toHaveBeenCalled();
  });
  
  it('should exit with error if required parameters are missing', () => {
    // Arrange
    // Reset the module cache before this test
    jest.resetModules();
    
    // Create a fresh mock for JWT
    jest.mock('jsonwebtoken', () => ({
      sign: jest.fn(),
      decode: jest.fn()
    }));
    
    // Missing email
    process.argv = [
      'node', 
      'generate-token.js', 
      '--id', 'test-id', 
      '--role', 'admin'
    ];
    
    // Import the mocked jwt for assertion
    const jwt = require('jsonwebtoken');
    
    // Act
    require('../../utils/generate-token');
    
    // Assert
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Missing required parameters'));
    expect(process.exit).toHaveBeenCalledWith(1);
    expect(jwt.sign).not.toHaveBeenCalled();
  });
  
  it('should handle JWT sign errors', () => {
    // Arrange
    process.argv = [
      'node', 
      'generate-token.js', 
      '--id', 'test-id', 
      '--email', 'test@example.com', 
      '--role', 'admin'
    ];
    
    // Import jwt for test assertions
    const jwt = require('jsonwebtoken');
    
    // Mock jwt.sign to throw an error
    jwt.sign.mockImplementationOnce(() => {
      throw new Error('JWT signing error');
    });
    
    // Act
    require('../../utils/generate-token');
    
    // Assert
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Error generating token:'), expect.stringContaining('JWT signing error'));
    expect(process.exit).toHaveBeenCalledWith(1);
  });
  
  it('should display decoded token information', () => {
    // Arrange
    process.argv = [
      'node', 
      'generate-token.js', 
      '--id', 'test-id', 
      '--email', 'test@example.com', 
      '--role', 'admin'
    ];
    
    // Reset jwt mock for this test
    jest.resetModules();
    jest.mock('jsonwebtoken', () => ({
      sign: jest.fn().mockReturnValue('mock-jwt-token'),
      decode: jest.fn().mockReturnValue({
        id: 'test-id',
        email: 'test@example.com',
        role: 'test-role',
        exp: Math.floor(Date.now() / 1000) + 3600 // Current time + 1 hour
      })
    }));
    
    // Import jwt for test assertions
    const jwt = require('jsonwebtoken');
    
    // Act
    require('../../utils/generate-token');
    
    // Assert
    expect(jwt.sign).toHaveBeenCalled();
    expect(jwt.decode).toHaveBeenCalled();
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Decoded Payload:'));
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Expires At:'));
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Use with API:'));
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Authorization: Bearer mock-jwt-token'));
  });
});

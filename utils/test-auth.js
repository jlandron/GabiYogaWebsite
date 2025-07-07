/**
 * Authentication Test Script for Gabi Jyoti Yoga Website
 * 
 * This script tests the authentication system to ensure it works
 * in both SQLite and MySQL environments.
 */

require('dotenv').config();
const jwt = require('jsonwebtoken');
const { AuthOperations } = require('../database/data-access');
const logger = require('./logger');

// Get JWT secret from environment variable
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  logger.error('JWT_SECRET environment variable is not set!');
  process.exit(1);
}

// Test function to validate cross-database compatibility
async function testAuthentication() {
  try {
    logger.info('Starting authentication test');
    
    // Step 1: Test user creation and authentication
    const testEmail = `test_${Date.now()}@example.com`;
    logger.info(`Creating test user with email: ${testEmail}`);
    
    const userData = {
      firstName: 'Test',
      lastName: 'User',
      email: testEmail,
      password: 'password123'
    };
    
    // Create test user
    const user = await AuthOperations.createUser(userData);
    logger.info(`Test user created with ID: ${user.user_id}`);
    
    // Skip password verification since the createUser function doesn't return the password hash
    // Instead, test direct login functionality
    logger.info('Testing direct login functionality');
    const loginUser = await AuthOperations.loginUser(userData.email, userData.password);
    
    if (!loginUser) {
      throw new Error('Login verification failed');
    }
    
    logger.info('Login verification successful');
    
    // Step 2: Test token generation and verification
    const userForToken = {
      id: user.user_id,
      email: user.email,
      role: user.role
    };
    
    // Generate token
    const token = jwt.sign(
      { 
        id: userForToken.id,
        email: userForToken.email,
        role: userForToken.role 
      },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
    logger.info('JWT token generated successfully');
    
    // Verify token
    const decodedToken = jwt.verify(token, JWT_SECRET);
    logger.info('JWT token verified successfully', {
      tokenId: decodedToken.id,
      tokenEmail: decodedToken.email,
      tokenRole: decodedToken.role
    });
    
    // Step 3: Test user retrieval with token ID
    const retrievedUser = await AuthOperations.findUserById(decodedToken.id);
    if (!retrievedUser) {
      throw new Error(`User retrieval failed for ID: ${decodedToken.id}`);
    }
    logger.info('User retrieved successfully using token ID', {
      userId: retrievedUser.user_id,
      userEmail: retrievedUser.email,
      userRole: retrievedUser.role
    });
    
    // Step 4: Test ID format consistency
    const tokenIdType = typeof decodedToken.id;
    const userIdType = typeof retrievedUser.user_id;
    logger.info('ID format check', {
      tokenIdType,
      tokenId: decodedToken.id,
      userIdType,
      userId: retrievedUser.user_id,
      match: decodedToken.id.toString() === retrievedUser.user_id.toString()
    });
    
    if (decodedToken.id.toString() !== retrievedUser.user_id.toString()) {
      throw new Error(`ID mismatch: Token ID ${decodedToken.id} (${tokenIdType}) != User ID ${retrievedUser.user_id} (${userIdType})`);
    }
    
    logger.info('Authentication test completed successfully');
    
    // Clean up: Delete the test user if needed
    // Uncomment the following line to enable test user deletion
    // await db.query(`DELETE FROM users WHERE email = ?`, [testEmail]);
    
    return true;
  } catch (error) {
    logger.error('Authentication test failed:', error);
    throw error;
  }
}

// Run the test if this script is executed directly
if (require.main === module) {
  logger.info('Running authentication test script');
  
  testAuthentication()
    .then(result => {
      logger.info(`Authentication test ${result ? 'passed' : 'failed'}`);
      process.exit(result ? 0 : 1);
    })
    .catch(error => {
      logger.error('Authentication test error:', error);
      process.exit(1);
    });
} else {
  // Export for use in other modules
  module.exports = { testAuthentication };
}

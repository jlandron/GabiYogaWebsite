/**
 * Authentication API for Gabi Jyoti Yoga Website
 * 
 * This file provides API endpoints for authentication operations
 * that interact with the SQLite database.
 */

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { AuthOperations } = require('../database/data-access');

// Environment variables from .env file loaded by server.js
// Get JWT secret from environment variable - no fallback for security
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('ERROR: JWT_SECRET environment variable is not set in auth.js!');
  console.error('Please set JWT_SECRET in your .env file');
  process.exit(1);
}

// Get JWT expiry from environment variable
const JWT_EXPIRY = process.env.JWT_EXPIRY || '24h';

/**
 * Login endpoint
 * POST /api/auth/login
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email and password are required' 
      });
    }

    // Find user by email
    const user = await AuthOperations.findUserByEmail(email);
    
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid credentials' 
      });
    }

    // Verify password
    const validPassword = await AuthOperations.verifyPassword(password, user.password_hash);
    
    if (!validPassword) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid credentials' 
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        id: user.user_id,
        email: user.email,
        role: user.role 
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRY }
    );

    // Return user info and token
    return res.status(200).json({
      success: true,
      message: 'Login successful',
      user: {
        id: user.user_id,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
        role: user.role,
        profilePicture: user.profile_picture
      },
      token
    });
    
  } catch (error) {
    console.error('Login error:', error);
    console.error('Login error stack:', error.stack);
    
    // Check for MySQL specific errors
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({
        success: false,
        message: 'Email is already registered'
      });
    }
    
    // Handle connection errors
    if (error.code === 'ECONNREFUSED' || error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('Database connection error:', error);
      return res.status(500).json({
        success: false,
        message: 'Unable to connect to database'
      });
    }
    
    return res.status(500).json({
      success: false,
      message: 'An error occurred during login',
      // Include error message in production to help debug the initial deployment
      error: error.message
    });
  }
});

/**
 * Register endpoint
 * POST /api/auth/register
 */
router.post('/register', async (req, res) => {
  try {
    const { firstName, lastName, email, password } = req.body;
    
    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'All fields are required' 
      });
    }

    // Check if user already exists
    const existingUser = await AuthOperations.findUserByEmail(email);
    
    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email is already registered' 
      });
    }

    // Create new user
    const user = await AuthOperations.createUser({
      firstName,
      lastName,
      email,
      password
    });

    // Generate JWT token
    const token = jwt.sign(
      { 
        id: user.user_id,
        email: user.email,
        role: user.role 
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRY }
    );

    // Return user info and token
    return res.status(201).json({
      success: true,
      message: 'Registration successful',
      user: {
        id: user.user_id,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
        role: user.role
      },
      token
    });
    
  } catch (error) {
    console.error('Registration error:', error);
    // Log the full error stack in production to help with debugging
    console.error('Registration error stack:', error.stack);
    
    // Check for MySQL specific errors
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({
        success: false,
        message: 'Email is already registered'
      });
    }
    
    // Handle connection errors
    if (error.code === 'ECONNREFUSED' || error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('Database connection error:', error);
      return res.status(500).json({
        success: false,
        message: 'Unable to connect to database'
      });
    }
    
    return res.status(500).json({
      success: false,
      message: 'An error occurred during registration',
      // Include error message in production to help debug the initial deployment
      // This should be removed or limited once the system is stable
      error: error.message
    });
  }
});

/**
 * User verification middleware
 * Verifies JWT token and adds user data to request
 */
const verifyToken = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ 
      success: false, 
      message: 'Access denied. No token provided.' 
    });
  }

  try {
    const verified = jwt.verify(token, JWT_SECRET);
    req.user = verified;
    next();
  } catch (error) {
    return res.status(401).json({ 
      success: false, 
      message: 'Invalid token' 
    });
  }
};

/**
 * Get current user endpoint (protected route)
 * GET /api/auth/me
 */
router.get('/me', verifyToken, async (req, res) => {
  try {
    const user = await AuthOperations.findUserById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    return res.status(200).json({
      success: true,
      user: {
        id: user.user_id,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
        role: user.role,
        profilePicture: user.profile_picture
      }
    });
    
  } catch (error) {
    console.error('Get current user error:', error);
    console.error('Get current user error stack:', error.stack);
    
    // Handle connection errors
    if (error.code === 'ECONNREFUSED' || error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('Database connection error:', error);
      return res.status(500).json({
        success: false,
        message: 'Unable to connect to database'
      });
    }
    
    return res.status(500).json({
      success: false,
      message: 'An error occurred while getting user data',
      // Include error message in production to help debug the initial deployment
      error: error.message
    });
  }
});

/**
 * Forgot password endpoint
 * POST /api/auth/forgot-password
 * 
 * This endpoint receives a request with an email,
 * creates a password reset token, and sends an email
 * with instructions to reset the password.
 * 
 * For security, it always returns a success message regardless of whether 
 * the email exists to prevent user enumeration attacks.
 */
router.post('/forgot-password', async (req, res) => {
  const logger = require('../utils/logger');
  let tokenResult = null;
  
  try {
    logger.info(`Received forgot password request`);
    
    const { email } = req.body;
    
    if (!email) {
      logger.warn(`Forgot password request missing email`);
      return res.status(400).json({ 
        success: false, 
        message: 'Email is required' 
      });
    }
    
    logger.info(`Processing forgot password for email: ${email.substring(0, 3)}...`);
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      logger.warn(`Invalid email format in forgot password request`);
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid email format' 
      });
    }
    
    // Get base URL from environment or default
    const baseUrl = process.env.BASE_URL || 
      (process.env.NODE_ENV === 'production' ? 'https://www.gabi.yoga' : 'http://localhost:5001');
    logger.info(`Using base URL for reset link: ${baseUrl}`);
    
    // Check if user exists and create token if so - but don't tell the client either way
    try {
      tokenResult = await AuthOperations.createPasswordResetToken(email);
      if (tokenResult) {
        logger.info(`Successfully created reset token for email: ${email.substring(0, 3)}...`);
      } else {
        logger.info(`No user found with email: ${email.substring(0, 3)}...`);
      }
    } catch (dbError) {
      // Log the DB error but don't expose it to the client
      logger.error(`Database error creating password reset token:`, dbError);
      
      // Return generic success response for security (prevent user enumeration)
      return res.status(200).json({
        success: true,
        message: 'If your email exists in our system, you will receive password reset instructions shortly.'
      });
    }
    
    // Only attempt to send email if we found a user and created a token
    if (tokenResult) {
      // Create reset URL
      const resetUrl = `${baseUrl}/reset-password.html?token=${tokenResult.token}&email=${encodeURIComponent(email)}`;
      logger.debug(`Reset URL created: ${resetUrl.substring(0, 30)}...`);
      
      try {
        // Load email service dynamically to prevent issues if it fails to initialize
        const emailService = require('../utils/email-service');
        
        // Send email - our improved email service will handle failures gracefully
        const emailResult = await emailService.sendPasswordResetEmail({
          to: email,
          resetToken: tokenResult.token,
          resetUrl: resetUrl
        });
        
        logger.info(`Password reset email handling result:`, emailResult);
        
        if (emailResult.method === 'fallback_log') {
          logger.warn(`Email delivery used fallback method for ${email.substring(0, 3)}... - user will not receive an actual email`);
        }
      } catch (emailError) {
        // Log the error but don't expose to client and don't break the flow
        logger.error('Error from email service:', emailError);
        logger.warn(`User ${email.substring(0, 3)}... will not receive password reset email due to service error`);
      }
    }
    
    // Always return success regardless of whether the email exists or if the email was sent
    // This is important for security to prevent user enumeration attacks
    return res.status(200).json({
      success: true,
      message: 'If your email exists in our system, you will receive password reset instructions shortly.'
    });
    
  } catch (error) {
    // Log the full error for debugging
    logger.error('Unexpected error in forgot-password endpoint:', error);
    logger.error('Error stack:', error.stack);
    
    // Generic error response - don't reveal specific details
    return res.status(500).json({
      success: false,
      message: 'An error occurred while processing your request.'
    });
  }
});

/**
 * Reset password endpoint
 * POST /api/auth/reset-password
 * 
 * This verifies the token and updates the user's password
 */
router.post('/reset-password', async (req, res) => {
  try {
    const logger = require('../utils/logger');
    let { token, email, password } = req.body;
    
    // Log parameters for debugging
    logger.info(`Reset password request - token=${token?.substring(0, 5)}..., email=${email}`);

    if (!token || !email || !password) {
      logger.warn('Missing required parameters in reset-password request');
      return res.status(400).json({
        success: false,
        message: 'Token, email, and password are required'
      });
    }
    
    // Fix encoding issue: If email contains spaces that should be plus signs
    if (email.includes(' ')) {
      const originalEmail = email;
      email = email.replace(/ /g, '+');
      logger.info(`Fixed email encoding in reset-password: "${originalEmail}" -> "${email}"`);
    }
    
    // Validate password
    if (password.length < 8) {
      logger.warn('Password too short in reset-password request');
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters'
      });
    }
    
    // Reset the password
    const success = await AuthOperations.resetPassword(token, email, password);
    
    if (success) {
      logger.info(`Password reset successful for: ${email.substring(0, 3)}...`);
      return res.status(200).json({
        success: true,
        message: 'Your password has been reset successfully. You can now log in with your new password.'
      });
    } else {
      logger.warn(`Invalid or expired reset token for: ${email.substring(0, 3)}...`);
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token. Please request a new password reset.'
      });
    }
  } catch (error) {
    const logger = require('../utils/logger');
    logger.error('Reset password error:', error);
    logger.error('Reset password error stack:', error.stack);
    
    // Generate user-friendly error message
    let errorMessage = 'An error occurred while resetting your password.';
    if (error.message && error.message.includes('Password must be')) {
      errorMessage = error.message;
    }
    
    return res.status(500).json({
      success: false,
      message: errorMessage
    });
  }
});

/**
 * Verify reset token endpoint
 * GET /api/auth/verify-reset-token
 * 
 * This verifies if a reset token is valid without actually resetting the password
 */
router.get('/verify-reset-token', async (req, res) => {
  try {
    const logger = require('../utils/logger');
    let { token, email } = req.query;
    
    // Log parameters for debugging
    logger.info(`Verifying reset token - Raw Query: token=${token}, email=${email}`);

    if (!token || !email) {
      logger.warn(`Missing token or email in reset token verification`);
      return res.status(400).json({
        success: false,
        message: 'Token and email are required'
      });
    }
    
    // Fix encoding issue: If email contains spaces that should be plus signs
    // This happens because '+' in URLs can get decoded as spaces
    if (email.includes(' ')) {
      const originalEmail = email;
      email = email.replace(/ /g, '+');
      logger.info(`Fixed email encoding: "${originalEmail}" -> "${email}"`);
    }
    
    // Log the parameters we're using for verification
    logger.info(`Verifying token for email: ${email.substring(0, 3)}...`);
    
    // Verify the token
    const userData = await AuthOperations.verifyPasswordResetToken(token, email);
    
    if (userData) {
      // Token is valid
      logger.info(`Token verification successful for ${email.substring(0, 3)}...`);
      return res.status(200).json({
        success: true,
        message: 'Token is valid',
        user: {
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName
        }
      });
    } else {
      // Invalid token
      logger.warn(`Invalid or expired token for ${email.substring(0, 3)}...`);
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token'
      });
    }
  } catch (error) {
    const logger = require('../utils/logger');
    logger.error('Verify reset token error:', error);
    logger.error('Verify reset token error stack:', error.stack);
    
    return res.status(500).json({
      success: false,
      message: 'An error occurred while verifying the token'
    });
  }
});

// Export the router and the verifyToken middleware as authenticateToken 
// for use in other files
module.exports = {
  router,
  authenticateToken: verifyToken
};

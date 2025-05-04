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
  try {
    const { email } = req.body;
    const logger = require('../utils/logger');
    const emailService = require('../utils/email-service');
    
    if (!email) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email is required' 
      });
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid email format' 
      });
    }
    
    // Get base URL from environment or default
    const baseUrl = process.env.BASE_URL || 
      (process.env.NODE_ENV === 'production' ? 'https://www.gabi.yoga' : 'http://localhost:5001');
    
    // Check if user exists and create token if so - but don't tell the client either way
    const tokenData = await AuthOperations.createPasswordResetToken(email);
    
    if (tokenData) {
      // User exists, send reset email
      
      // Create reset URL
      const resetUrl = `${baseUrl}/reset-password.html?token=${tokenData.token}&email=${encodeURIComponent(email)}`;
      
      try {
        // Send email
        await emailService.sendPasswordResetEmail({
          to: email,
          resetToken: tokenData.token,
          resetUrl: resetUrl
        });
        
        logger.info(`Password reset email sent to: ${email}`);
      } catch (emailError) {
        logger.error('Error sending password reset email:', emailError);
        // We don't expose this error to the client for security
      }
    } else {
      // No user with this email, log but don't expose to client
      logger.info(`Password reset requested for non-existent user: ${email}`);
    }
    
    // Always return success regardless of whether the email exists
    return res.status(200).json({
      success: true,
      message: 'If your email exists in our system, you will receive password reset instructions shortly.'
    });
    
  } catch (error) {
    console.error('Forgot password error:', error);
    console.error('Forgot password error stack:', error.stack);
    
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
    const { token, email, password } = req.body;
    const logger = require('../utils/logger');
    
    if (!token || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Token, email, and password are required'
      });
    }
    
    // Validate password
    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters'
      });
    }
    
    // Reset the password
    const success = await AuthOperations.resetPassword(token, email, password);
    
    if (success) {
      logger.info(`Password reset successful for: ${email}`);
      return res.status(200).json({
        success: true,
        message: 'Your password has been reset successfully. You can now log in with your new password.'
      });
    } else {
      logger.warn(`Invalid or expired reset token for: ${email}`);
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token. Please request a new password reset.'
      });
    }
  } catch (error) {
    console.error('Reset password error:', error);
    console.error('Reset password error stack:', error.stack);
    
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
    const { token, email } = req.query;
    
    if (!token || !email) {
      return res.status(400).json({
        success: false,
        message: 'Token and email are required'
      });
    }
    
    // Verify the token
    const userData = await AuthOperations.verifyPasswordResetToken(token, email);
    
    if (userData) {
      // Token is valid
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
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token'
      });
    }
  } catch (error) {
    console.error('Verify reset token error:', error);
    console.error('Verify reset token error stack:', error.stack);
    
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

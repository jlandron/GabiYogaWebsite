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

// Export the router and the verifyToken middleware as authenticateToken 
// for use in other files
module.exports = {
  router,
  authenticateToken: verifyToken
};

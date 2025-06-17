/**
 * Authentication Middleware for Gabi Jyoti Yoga Website
 * 
 * This file provides middleware functions for authentication
 * using Passport.js with JWT and local strategies.
 */

const passport = require('passport');
const jwt = require('jsonwebtoken');
const { sendError } = require('./api-response');
const logger = require('./logger');

/**
 * Generate a JWT token for a user
 * @param {Object} user - The user object to encode in the token
 * @param {string} secret - The JWT secret key
 * @param {string} expiresIn - Token expiration time (e.g., '24h', '7d')
 * @returns {string} JWT token
 */
function generateToken(user, secret, expiresIn = '24h') {
  return jwt.sign(
    { 
      id: user.id,
      email: user.email,
      role: user.role 
    },
    secret,
    { expiresIn }
  );
}

/**
 * Middleware to authenticate using JWT strategy
 */
function authenticateJWT(req, res, next) {
  passport.authenticate('jwt', { session: false }, (err, user, info) => {
    if (err) {
      logger.error('JWT authentication error:', err);
      return sendError(res, 'Authentication error', 500);
    }
    
    if (!user) {
      return sendError(res, 'Access denied. Invalid token.', 401);
    }
    
    // Add user to request object
    req.user = user;
    next();
  })(req, res, next);
}

/**
 * Middleware to authenticate using local strategy
 * Used for login routes
 */
function authenticateLocal(req, res, next) {
  passport.authenticate('local', { session: false }, (err, user, info) => {
    if (err) {
      logger.error('Local authentication error:', err);
      return sendError(res, 'Authentication error', 500);
    }
    
    if (!user) {
      return sendError(res, info?.message || 'Invalid credentials', 401);
    }
    
    // Add user to request object
    req.user = user;
    next();
  })(req, res, next);
}

/**
 * Middleware to check if user is an admin
 * Must be used after authenticateJWT
 */
function requireAdmin(req, res, next) {
  if (!req.user) {
    return sendError(res, 'Authentication required', 401);
  }
  
  if (req.user.role !== 'admin') {
    return sendError(res, 'Admin access required', 403);
  }
  
  next();
}

/**
 * Middleware to validate token
 * Used for token validation endpoint
 */
function validateToken(req, res, next) {
  passport.authenticate('jwt', { session: false }, (err, user, info) => {
    if (err) {
      logger.error('Token validation error:', err);
      return res.status(401).json({
        valid: false,
        message: 'Authentication error'
      });
    }
    
    if (!user) {
      return res.status(401).json({
        valid: false,
        message: 'Invalid token'
      });
    }
    
    // Add validation result to request
    req.tokenValidation = { valid: true, user };
    next();
  })(req, res, next);
}

module.exports = {
  generateToken,
  authenticateJWT,
  authenticateLocal,
  requireAdmin,
  validateToken
};

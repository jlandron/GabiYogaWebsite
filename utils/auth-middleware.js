/**
 * Authentication Middleware for Gabi Jyoti Yoga Website
 * 
 * This file provides middleware functions for authentication
 * using Passport.js with JWT and local strategies.
 * Enhanced to work consistently across SQLite and MySQL environments.
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
  // Ensure user ID is properly formatted - convert to string if needed
  // This helps with consistency between SQLite (which may use numbers) and MySQL
  const userId = user.id ? user.id.toString() : (user.user_id ? user.user_id.toString() : null);
  
  if (!userId) {
    logger.error('Cannot generate token: Missing user ID', { user });
    throw new Error('User ID is required to generate a token');
  }
  
  return jwt.sign(
    { 
      id: userId,
      email: user.email,
      role: user.role 
    },
    secret,
    { expiresIn }
  );
}

/**
 * Middleware to authenticate using JWT strategy with better error handling
 */
function authenticateJWT(req, res, next) {
  // We now consistently use the Authorization header for token-based auth
  const token = req.header('Authorization')?.replace('Bearer ', '');
  logger.debug('JWT Authentication attempt', { 
    hasToken: !!token,
    tokenLength: token ? token.length : 0
  });
  
  if (!token) {
    logger.warn('No JWT token provided');
    return sendError(res, 'Access denied. No token provided.', 401);
  }
  
  passport.authenticate('jwt', { session: false }, (err, user, info) => {
    if (err) {
      logger.error('JWT authentication error:', err);
      return sendError(res, 'Authentication error', 500);
    }
    
    if (!user) {
      logger.warn('Invalid JWT token', { info: info?.message || 'No additional info' });
      return sendError(res, 'Access denied. Invalid token.', 401);
    }
    
    // Add user to request object
    logger.debug('JWT Authentication successful', { 
      userId: user.id || user.user_id,
      role: user.role 
    });
    
    req.user = user;
    next();
  })(req, res, next);
}

/**
 * Middleware to authenticate using local strategy
 * Used for login routes with improved error handling
 */
function authenticateLocal(req, res, next) {
  // Log authentication attempt
  logger.debug('Local Authentication attempt', { 
    email: req.body.email && req.body.email.substring(0, 3) + '...' 
  });
  
  passport.authenticate('local', { session: false }, (err, user, info) => {
    if (err) {
      logger.error('Local authentication error:', err);
      return sendError(res, 'Authentication error', 500);
    }
    
    if (!user) {
      logger.warn('Invalid credentials', { info: info?.message || 'No additional info' });
      return sendError(res, info?.message || 'Invalid credentials', 401);
    }
    
    // Add user to request object
    logger.debug('Local Authentication successful', { 
      userId: user.id || user.user_id,
      role: user.role 
    });
    
    req.user = user;
    next();
  })(req, res, next);
}

/**
 * Middleware to check if user is an admin
 * Works with both JWT and session authentication
 */
function requireAdmin(req, res, next) {
  // First check session-based user if available
  const sessionUser = req.user;
  
  // If no user object at all, deny access
  if (!sessionUser) {
    logger.warn('No user in request for admin check');
    return sendError(res, 'Authentication required', 401);
  }
  
  // For session users, role may be in different property
  const role = sessionUser.role || 
               sessionUser.user_role || 
               (sessionUser.dataValues && sessionUser.dataValues.role);
  
  if (role !== 'admin') {
    logger.warn('Non-admin user attempted to access admin route', { role });
    return sendError(res, 'Admin access required', 403);
  }
  
  logger.debug('Admin access granted to user');
  next();
}

/**
 * Middleware to validate token
 * Used for token validation endpoint with extended error handling
 */
function validateToken(req, res, next) {
  // Get token from Authorization header
  const token = req.header('Authorization')?.replace('Bearer ', '');
  
  // Log validation attempt for debugging
  logger.debug('Token validation attempt', { 
    hasToken: !!token,
    tokenLength: token ? token.length : 0 
  });
  
  // If no token provided, return 401
  if (!token) {
    logger.warn('No token provided for validation');
    return res.status(401).json({
      valid: false,
      message: 'No token provided'
    });
  }
  
  passport.authenticate('jwt', { session: false }, (err, user, info) => {
    if (err) {
      logger.error('Token validation error:', err);
      return res.status(401).json({
        valid: false,
        message: 'Authentication error'
      });
    }
    
    if (!user) {
      logger.warn('Invalid token for validation', { info: info?.message || 'No additional info' });
      return res.status(401).json({
        valid: false,
        message: 'Invalid token'
      });
    }
    
    // Add validation result to request
    logger.debug('Token validation successful', { 
      userId: user.id || user.user_id,
      role: user.role 
    });
    
    req.tokenValidation = { valid: true, user };
    next();
  })(req, res, next);
}

/**
 * Fallback authentication middleware for compatibility with older code
 * This now prioritizes session authentication over JWT token validation
 * and will fail open (continue with request) if session is valid but JWT has issues
 */
function authenticateTokenCompat(req, res, next) {
  // First check if there's a valid session
  if (req.isAuthenticated && req.isAuthenticated()) {
    logger.debug('authenticateTokenCompat: User authenticated via session');
    // If session authentication is valid, proceed immediately
    return next();
  }
  
  // If no valid session, try JWT token authentication
  const token = req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    // Check if user has session cookie but not authenticated yet
    if (req.cookies && (req.cookies['connect.sid'] || req.cookies.sessionId)) {
      logger.warn('Session cookie exists but user is not authenticated - allowing access');
      // Allow request to proceed with session authentication
      return next();
    }
    
    logger.warn('No JWT token or session provided');
    return res.status(401).json({ 
      success: false, 
      message: 'Access denied. No authentication provided.' 
    });
  }

  // Use the JWT secret from environment
  const JWT_SECRET = process.env.JWT_SECRET;
  
  try {
    // Verify token directly for backward compatibility
    const verified = jwt.verify(token, JWT_SECRET);
    req.user = verified;
    next();
  } catch (error) {
    // Log the JWT error but continue if session might be valid
    logger.warn('JWT Token verification failed, but proceeding with session auth:', error.message);
    
    // Check if we have any session data
    if (req.cookies && (req.cookies['connect.sid'] || req.cookies.sessionId)) {
      logger.info('Session cookie exists - allowing access despite JWT failure');
      // Allow request to proceed with potential session authentication
      return next();
    }
    
    // No session and invalid token means truly unauthorized
    logger.error('Both JWT and session authentication failed');
    return res.status(401).json({ 
      success: false, 
      message: 'Invalid authentication' 
    });
  }
}

module.exports = {
  generateToken,
  authenticateJWT,
  authenticateLocal,
  requireAdmin,
  validateToken,
  authenticateTokenCompat
};

/**
 * Passport Configuration for Gabi Jyoti Yoga Website
 * 
 * This file sets up Passport.js strategies for authentication:
 * - Local strategy for username/password login
 * - JWT strategy for token-based authentication
 */

const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const JwtStrategy = require('passport-jwt').Strategy;
const ExtractJwt = require('passport-jwt').ExtractJwt;
const { AuthOperations } = require('../database/data-access');

/**
 * Configure and initialize Passport authentication strategies
 * @param {Object} options - Configuration options
 * @param {string} options.jwtSecret - Secret key for JWT signing/verification
 */
function initializePassport(options) {
  const { jwtSecret } = options;
  const logger = require('./logger');
  
  if (!jwtSecret) {
    throw new Error('JWT secret is required for Passport initialization');
  }
  
  logger.info('Initializing Passport.js with authentication strategies');
  
  // Configure local strategy for username/password login
  passport.use(new LocalStrategy(
    { 
      usernameField: 'email',
      passwordField: 'password' 
    },
    async (email, password, done) => {
      try {
        // Find user by email
        const user = await AuthOperations.findUserByEmail(email);
        
        if (!user) {
          return done(null, false, { message: 'Invalid credentials' });
        }
        
        // Verify password
        const validPassword = await AuthOperations.verifyPassword(password, user.password_hash);
        
        if (!validPassword) {
          return done(null, false, { message: 'Invalid credentials' });
        }
        
        // Return user object without sensitive data
        return done(null, {
          id: user.user_id,
          firstName: user.first_name,
          lastName: user.last_name,
          email: user.email,
          role: user.role,
          profilePicture: user.profile_picture
        });
      } catch (error) {
        logger.error('LocalStrategy error:', {
          error: error.message,
          code: error.code,
          stack: error.stack
        });
        return done(error);
      }
    }
  ));
  
  // Configure JWT strategy for token authentication
  const jwtOptions = {
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: jwtSecret
  };
  
  passport.use(new JwtStrategy(jwtOptions, async (payload, done) => {
    logger.debug('JWT Strategy: Verifying token payload', { 
      id: payload.id,
      role: payload.role,
      exp: payload.exp
    });
    
    try {
      // Handle potential format differences between databases
      const userId = payload.id ? payload.id.toString() : null;
      
      if (!userId) {
        logger.warn('JWT payload missing user ID');
        return done(null, false);
      }
      
      // Try to find user by ID from JWT payload
      let user;
      try {
        user = await AuthOperations.findUserById(userId);
      } catch (dbError) {
        logger.error('Database error in JWT strategy:', {
          error: dbError.message,
          code: dbError.code,
          userId: userId
        });
        
        // If it's a database connection error, return error
        if (dbError.code === 'ECONNREFUSED' || dbError.code === 'ER_ACCESS_DENIED_ERROR') {
          return done(dbError);
        }
        
        // For other database errors, user might not exist
        return done(null, false);
      }
      
      if (!user) {
        logger.warn(`JWT validation: User not found for ID ${userId}`);
        return done(null, false);
      }
      
      // Return user object without sensitive data
      const userForAuth = {
        id: user.user_id,
        email: user.email,
        role: user.role,
        firstName: user.first_name,
        lastName: user.last_name,
        profilePicture: user.profile_picture
      };
      
      logger.debug('JWT validation successful', { 
        userId: user.user_id,
        role: user.role
      });
      
      return done(null, userForAuth);
    } catch (error) {
      logger.error('JWT validation error:', {
        error: error.message,
        stack: error.stack,
        code: error.code
      });
      return done(error, false);
    }
  }));
  
  // Serialize user to the session
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });
  
  // Deserialize user from the session
  passport.deserializeUser(async (id, done) => {
    try {
      // Convert id to string to handle both SQLite and MySQL
      const userId = id ? id.toString() : null;
      
      if (!userId) {
        logger.warn('User deserialize: Missing user ID');
        return done(null, false);
      }
      
      let user;
      try {
        user = await AuthOperations.findUserById(userId);
      } catch (dbError) {
        logger.error('Database error in deserializeUser:', {
          error: dbError.message,
          code: dbError.code,
          userId: userId
        });
        
        // For database errors, return error
        return done(dbError, false);
      }
      
      if (!user) {
        logger.warn(`User deserialize: User not found for ID ${userId}`);
        return done(null, false);
      }
      
      // Return user object without sensitive data
      const userObj = {
        id: user.user_id,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
        role: user.role,
        profilePicture: user.profile_picture
      };
      
      logger.debug('User deserialized successfully', {
        userId: user.user_id,
        role: user.role
      });
      
      done(null, userObj);
    } catch (error) {
      logger.error('User deserialize error:', {
        error: error.message,
        stack: error.stack
      });
      done(error, false);
    }
  });
  
  logger.info('Passport initialization complete');
  return passport;
}

module.exports = { initializePassport };

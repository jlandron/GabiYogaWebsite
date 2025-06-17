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
  
  if (!jwtSecret) {
    throw new Error('JWT secret is required for Passport initialization');
  }
  
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
    try {
      // Find user by ID from JWT payload
      const user = await AuthOperations.findUserById(payload.id);
      
      if (!user) {
        return done(null, false);
      }
      
      // Return user object without sensitive data
      return done(null, {
        id: user.user_id,
        email: user.email,
        role: user.role
      });
    } catch (error) {
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
      const user = await AuthOperations.findUserById(id);
      if (!user) {
        return done(null, false);
      }
      
      // Return user object without sensitive data
      done(null, {
        id: user.user_id,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
        role: user.role,
        profilePicture: user.profile_picture
      });
    } catch (error) {
      done(error, false);
    }
  });
  
  return passport;
}

module.exports = { initializePassport };

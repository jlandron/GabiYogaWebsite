/**
 * Express Server for Yoga Website
 *
 * This file sets up the Express server with the necessary routes and middleware
 * to connect the frontend to the SQLite database.
 */

const express = require('express');
const path = require('path');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const passport = require('passport');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const { sendSuccess, sendError, asyncHandler } = require('./utils/api-response');
const { errorHandler, notFoundHandler } = require('./middleware/error-handler');
const logger = require('./utils/logger');
const { initializePassport } = require('./utils/passport-config');
const { initializeDatabase } = require('./database/schema');
const { initializePricingDatabase } = require('./database/schema-pricing');
const { initializeBlogDatabase } = require('./database/schema-blog');
const {
  AuthOperations,
  ClassOperations,
  RetreatOperations,
  WorkshopOperations,
  WebsiteSettingsOperations
} = require('./database/data-access');
require('dotenv').config(); // Load environment variables

// Import API routes
const adminRoutes = require('./api/admin');
const adminSettingsRoutes = require('./api/admin-settings');
const adminPricingRoutes = require('./api/admin-pricing');
const adminCustomerDashboardRoutes = require('./api/admin-customer-dashboard');
const adminCommunicationsRoutes = require('./api/admin-communications');
const adminNewsletterRoutes = require('./api/admin-newsletter');
const galleryRoutes = require('./api/gallery');
const { router: blogRoutes } = require('./api/blog'); // Import blog routes
// const stripeRoutes = require('./api/stripe'); // Import Stripe payment routes
const { router: authRouter, authenticateToken } = require('./api/auth');  // Import auth router and middleware
const privateSessionsRoutes = require('./api/private-sessions'); // Import private sessions routes
const dashboardRoutes = require('./api/dashboard'); // Import dashboard routes
const userLocationApi = require('./api/user-location'); // Import user location API
const newsletterRoutes = require('./api/newsletter'); // Import newsletter routes
const contactRoutes = require('./api/contact'); // Import contact routes
const scheduleRoutes = require('./api/schedule'); // Import schedule routes
const classBookingsRoutes = require('./api/class-bookings'); // Import class bookings routes
const imagesRoutes = require('./api/images'); // Import images API routes
// Removed mock routes to use real database data

// Create Express app
const app = express();
const PORT = process.env.PORT || 5000;

// JWT secret will be loaded asynchronously from AWS Secrets Manager
// Import the JWT Secret loader
const { initializeJWTSecret } = require('./utils/aws-jwt-secret');

// JWT_SECRET will be initialized in startServer function
let JWT_SECRET = null;

// Middleware
app.use(cors());
app.use(express.json({ limit: '15mb' }));  // Increased from 10mb to 15mb
app.use(express.urlencoded({ extended: true, limit: '15mb' }));  // Increased from 10mb to 15mb
app.use(express.static(path.join(__dirname)));
app.use(cookieParser());

// Session and Passport will be initialized in startServer function after JWT_SECRET is loaded

// Serve files from uploads directory (for image storage)
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  maxAge: '1d', // Cache static files for 1 day
  etag: true,   // Use ETags for cache validation
}));

// Add request logging middleware
app.use(logger.requestLogger);

// Add headers to allow larger requests and increase timeout
app.use((req, res, next) => {
  // Increase timeout for large uploads
  req.setTimeout(300000); // 5 minutes
  next();
});

// Health check endpoint for AWS load balancer
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Server is healthy' });
});

// Authentication middleware is imported from auth.js

// API Routes
// Use auth router for authentication endpoints (will be replaced with new auth routes)
app.use('/api/auth', authRouter);

// Public API endpoints for homepage data

// Public API endpoint for featured retreats (for homepage)
app.get('/api/retreats/featured', asyncHandler(async (req, res) => {
  const retreats = await RetreatOperations.getFeaturedRetreats();
  return sendSuccess(res, { retreats }, 'Featured retreats fetched successfully');
}));

// Public API endpoint for all retreats
app.get('/api/retreats', asyncHandler(async (req, res) => {
  const retreats = await RetreatOperations.getPublishedRetreats();
  return sendSuccess(res, { retreats }, 'Retreats fetched successfully');
}));

// Public API endpoint for workshops
app.get('/api/workshops', asyncHandler(async (req, res) => {
  const workshops = await WorkshopOperations.getUpcomingWorkshops();
  return sendSuccess(res, { workshops }, 'Workshops fetched successfully');
}));

// Public API endpoint for website settings (for homepage)
app.get('/api/website-settings', asyncHandler(async (req, res) => {
  const settings = await WebsiteSettingsOperations.getSettings();
  return sendSuccess(res, { settings }, 'Website settings fetched successfully');
}));

// Public API endpoint for section visibility settings
app.get('/api/settings', asyncHandler(async (req, res) => {
  const settings = await WebsiteSettingsOperations.getSettings();
  return sendSuccess(res, { settings }, 'Settings fetched successfully');
}));

// Create an admin router with updated authentication middleware that prioritizes sessions
const adminRouter = express.Router();
adminRouter.use((req, res, next) => {
  // Log authentication attempt
  logger.debug('Admin API authentication attempt', {
    hasSession: req.isAuthenticated && req.isAuthenticated(),
    hasSessionCookie: !!(req.cookies && req.cookies['connect.sid']),
    path: req.path
  });
  
  // Use our updated authenticateToken function that prioritizes session auth
  authenticateToken(req, res, next);
});

// Register admin routes (all protected by authenticateToken)
adminRouter.use('/', adminRoutes);
adminRouter.use('/', adminSettingsRoutes);
adminRouter.use('/', adminPricingRoutes);
adminRouter.use('/', adminCustomerDashboardRoutes);
adminRouter.use('/', adminCommunicationsRoutes);
adminRouter.use('/', adminNewsletterRoutes);

// Register API routes
app.use('/api/admin', adminRouter);
app.use('/api', adminPricingRoutes); // For public pricing endpoint
app.use('/api/gallery', galleryRoutes); // Gallery routes for both public and admin
app.use('/api/blog', blogRoutes); // Blog routes for both public and admin
// app.use('/api/stripe', stripeRoutes); // Stripe payment routes
app.use('/api/private-sessions', privateSessionsRoutes); // Private sessions routes
app.use('/api', dashboardRoutes); // Dashboard routes for authenticated users
app.use('/api/newsletter', newsletterRoutes); // Newsletter routes
app.use('/api/contact', contactRoutes); // Contact routes
app.use('/api/schedule', scheduleRoutes); // Schedule routes
app.use('/api/class-bookings', classBookingsRoutes); // Class bookings routes
app.use('/api/images', imagesRoutes); // Images API routes for presigned URLs

// User location detection endpoints (public)
app.get('/api/get-user-location', asyncHandler(userLocationApi.handleGetUserLocation));
app.get('/api/get-region-recommendation', asyncHandler(userLocationApi.handleGetRegionRecommendation));

// Add custom middleware to make user available to templates
app.use((req, res, next) => {
  res.locals.user = req.user;
  next();
});

// Fallback route for SPA with environment variable injection
// This should be after API routes but before error handlers
app.get('*', (req, res) => {
  // Read the index.html file and inject environment variables
  const fs = require('fs');
  const indexPath = path.join(__dirname, 'index.html');
  
  fs.readFile(indexPath, 'utf8', (err, html) => {
    if (err) {
      logger.error('Error reading index.html', { error: err.message });
      return res.status(500).send('Internal Server Error');
    }
    
    // Inject environment variables into the HTML
    const modifiedHtml = html.replace(
      'window.NODE_ENV = window.NODE_ENV || \'production\';',
      `window.NODE_ENV = '${process.env.NODE_ENV || 'production'}';`
    ).replace(
      'window.GLOBAL_CLOUDFRONT_URL = window.GLOBAL_CLOUDFRONT_URL || \'\';',
      `window.GLOBAL_CLOUDFRONT_URL = '${process.env.GLOBAL_CLOUDFRONT_URL || ''}';`
    );
    
    res.send(modifiedHtml);
  });
});

// Log all unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Promise Rejection', {
    reason: reason.toString(),
    stack: reason.stack || 'No stack trace available'
  });
});

// Log uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', {
    error: error.message,
    stack: error.stack
  });
  // Give logger time to flush logs before exiting
  setTimeout(() => process.exit(1), 1000);
});

// Error handling and not found middleware (must come after all routes)
app.use(notFoundHandler); // Handle 404 for unknown API routes
app.use(errorHandler);    // Handle all other errors

// Initialize database and start server
const startServer = async () => {
  try {
    // Initialize JWT secret first
    logger.info('Fetching JWT secret from AWS Secrets Manager...');
    JWT_SECRET = await initializeJWTSecret();
    
    if (!JWT_SECRET) {
      logger.error('Failed to obtain JWT_SECRET from AWS Secrets Manager or environment');
      process.exit(1);
    }
    
    // Store the JWT secret in the app object so it can be accessed by middleware
    app.set('jwtSecret', JWT_SECRET);
    logger.info('JWT secret stored in app settings');
    
    // Re-initialize session middleware with the loaded JWT_SECRET
    app.use(session({
      secret: JWT_SECRET,
      resave: false,
      saveUninitialized: false,
      cookie: { 
        secure: process.env.NODE_ENV === 'production', 
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        path: '/', // Ensure cookie is sent for all paths
        httpOnly: true // Cannot be accessed by JavaScript (more secure)
      }
    }));
    
    // Re-initialize Passport with the loaded JWT_SECRET
    const passportInstance = initializePassport({ jwtSecret: JWT_SECRET });
    app.use(passportInstance.initialize());
    app.use(passportInstance.session());
    
    // Initialize core database tables
    logger.info('Initializing core database tables...');
    await initializeDatabase();

    // Initialize pricing tables
    logger.info('Initializing pricing database tables...');
    await initializePricingDatabase();
    
    // Initialize blog tables
    logger.info('Initializing blog database tables...');
    await initializeBlogDatabase();
    
    // Fix blog images to ensure they have file_path values
    logger.info('Checking and fixing blog images...');
    try {
      const fixBlogImages = require('./utils/fix-blog-images');
      const fixResults = await fixBlogImages();
      logger.info('Blog image check complete:', fixResults);
    } catch (fixError) {
      logger.error('Error fixing blog images:', fixError);
      // Continue with server start despite errors
    }

    // Start server
    app.listen(PORT, () => {
      logger.info(`Server started successfully on port ${PORT}`, {
        port: PORT,
        environment: process.env.NODE_ENV || 'development',
        url: `http://localhost:${PORT}`,
        jwtConfigured: !!JWT_SECRET
      });
    });
  } catch (error) {
    logger.error('Failed to start server', { error: error.message, stack: error.stack });
    process.exit(1);
  }
};

startServer();

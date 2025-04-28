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
const { sendSuccess, sendError, asyncHandler } = require('./utils/api-response');
const { errorHandler, notFoundHandler } = require('./middleware/error-handler');
const logger = require('./utils/logger');
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
const galleryRoutes = require('./api/gallery');
const blogRoutes = require('./api/blog'); // Import blog routes
const stripeRoutes = require('./api/stripe'); // Import Stripe payment routes
const { router: authRouter, authenticateToken } = require('./api/auth');  // Import auth router and middleware
// Removed mock routes to use real database data

// Create Express app
const app = express();
const PORT = process.env.PORT || 5001; // Use port 5001 instead of 5000

// Set JWT secret from environment variable with validation
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  logger.error('JWT_SECRET environment variable is not set!', {
    suggestion: 'Please set JWT_SECRET in your .env file'
  });
  process.exit(1);
}

// Set JWT expiry
const JWT_EXPIRY = process.env.JWT_EXPIRY || '24h';

// Validate environment
if (process.env.NODE_ENV === 'production') {
  if (JWT_SECRET === 'CHANGE_THIS_IN_PRODUCTION_TO_SECURE_RANDOM_STRING') {
    logger.error('Default JWT_SECRET detected in production environment!', {
      suggestion: 'Please change the JWT_SECRET to a secure random string before deploying to production'
    });
    process.exit(1);
  }
}

// Middleware
app.use(cors());
app.use(express.json({ limit: '15mb' }));  // Increased from 10mb to 15mb
app.use(express.urlencoded({ extended: true, limit: '15mb' }));  // Increased from 10mb to 15mb
app.use(express.static(path.join(__dirname)));

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
// Use auth router for authentication endpoints
app.use('/api/auth', authRouter);

// Public API endpoints for homepage data
app.get('/api/schedule', asyncHandler(async (req, res) => {
  const classes = await ClassOperations.getClasses();

  // Format classes by day and time for easy rendering on the frontend
  const formattedSchedule = {
    0: [], // Sunday
    1: [], // Monday
    2: [], // Tuesday
    3: [], // Wednesday
    4: [], // Thursday
    5: [], // Friday
    6: []  // Saturday
  };

  classes.forEach(classInfo => {
    if (classInfo.active) {
      formattedSchedule[classInfo.day_of_week].push({
        class_id: classInfo.class_id,
        name: classInfo.name,
        start_time: classInfo.start_time,
        duration: classInfo.duration,
        instructor: classInfo.instructor,
        level: classInfo.level
      });
    }
  });

  // Sort classes by start_time for each day
  Object.keys(formattedSchedule).forEach(day => {
    formattedSchedule[day].sort((a, b) => {
      return a.start_time.localeCompare(b.start_time);
    });
  });

  return sendSuccess(res, { schedule: formattedSchedule }, 'Class schedule fetched successfully');
}));

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

// Create an admin router with authentication middleware
const adminRouter = express.Router();
adminRouter.use(authenticateToken);

// Register admin routes (all protected by authenticateToken)
adminRouter.use('/', adminRoutes);
adminRouter.use('/', adminSettingsRoutes);
adminRouter.use('/', adminPricingRoutes);
adminRouter.use('/', adminCustomerDashboardRoutes);

// Remove the special case webhook handler - it's already defined in the stripe routes module

// Register API routes
app.use('/api/admin', adminRouter);
app.use('/api', adminPricingRoutes); // For public pricing endpoint
app.use('/api/gallery', galleryRoutes); // Gallery routes for both public and admin
app.use('/api/blog', blogRoutes); // Blog routes for both public and admin
app.use('/api/stripe', stripeRoutes); // Stripe payment routes

// Fallback route for SPA
// This should be after API routes but before error handlers
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
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
    // Initialize core database tables
    logger.info('Initializing core database tables...');
    await initializeDatabase();

    // Initialize pricing tables
    logger.info('Initializing pricing database tables...');
    await initializePricingDatabase();
    
    // Initialize blog tables
    logger.info('Initializing blog database tables...');
    await initializeBlogDatabase();

    // Start server
    app.listen(PORT, () => {
      logger.info(`Server started successfully on port ${PORT}`, {
        port: PORT,
        environment: process.env.NODE_ENV || 'development',
        url: `http://localhost:${PORT}`
      });
    });
  } catch (error) {
    logger.error('Failed to start server', { error: error.message, stack: error.stack });
    process.exit(1);
  }
};

startServer();

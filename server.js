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
const { initializeDatabase } = require('./database/schema');
const { initializePricingDatabase } = require('./database/schema-pricing');
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
const { router: authRouter, authenticateToken } = require('./api/auth');  // Import auth router and middleware
// Removed mock routes to use real database data

// Create Express app
const app = express();
const PORT = process.env.PORT || 5001; // Use port 5001 instead of 5000

// Set JWT secret from environment variable or use a default for development
const JWT_SECRET = process.env.JWT_SECRET || 'yoga_dev_secret_key_for_jwt';
const JWT_EXPIRY = '24h';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

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

// Register API routes
app.use('/api/admin', adminRouter);
app.use('/api', adminPricingRoutes); // For public pricing endpoint
app.use('/api/gallery', galleryRoutes); // Gallery routes for both public and admin

// Fallback route for SPA
// This should be after API routes but before error handlers
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Error handling and not found middleware (must come after all routes)
app.use(notFoundHandler); // Handle 404 for unknown API routes
app.use(errorHandler);    // Handle all other errors

// Initialize database and start server
const startServer = async () => {
  try {
    // Initialize database
    await initializeDatabase();
    
    // Initialize pricing tables
    await initializePricingDatabase();
    
    // Start server
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`http://localhost:${PORT}`);
      
      if (process.env.NODE_ENV === 'development') {
        console.log('Running in development mode');
      }
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

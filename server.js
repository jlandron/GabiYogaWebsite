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
const { initializeDatabase } = require('./database/schema');
const { initializePricingDatabase } = require('./database/schema-pricing');
const { AuthOperations } = require('./database/data-access');
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
app.get('/api/schedule', async (req, res) => {
  try {
    const { ClassOperations } = require('./database/data-access');
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
    
    return res.json({
      success: true,
      schedule: formattedSchedule
    });
  } catch (error) {
    console.error('Error fetching class schedule:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch class schedule',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// (Removed duplicate route - only keeping one version below)

// Public API endpoint for featured retreats (for homepage)
app.get('/api/retreats/featured', async (req, res) => {
  try {
    // Since the retreats table doesn't exist in SQLite yet, return hardcoded sample data
    const mockRetreats = [
      {
        retreat_id: 1,
        title: "Mountain Serenity Retreat",
        description: "Escape to the majestic Blue Ridge Mountains for 5 days of yoga, meditation, hiking, and self-discovery.",
        start_date: "2025-06-10",
        end_date: "2025-06-15",
        location: "Blue Ridge Mountains",
        price: "1200",
        image_url: "images/DSC02638.JPG",
        retreat_slug: "mountain-serenity-retreat-2025"
      },
      {
        retreat_id: 2,
        title: "Coastal Bliss Retreat",
        description: "Immerse yourself in a week of beachside yoga, Caribbean sunshine, and Mayan cultural experiences.",
        start_date: "2025-09-05",
        end_date: "2025-09-12",
        location: "Tulum, Mexico",
        price: "1800",
        image_url: "images/DSC02646.JPG",
        retreat_slug: "coastal-bliss-retreat-2025"
      },
      {
        retreat_id: 3,
        title: "Desert Renewal Retreat",
        description: "Experience the magical healing energy of Sedona's red rocks with daily yoga, meditation, and vortex hikes.",
        start_date: "2025-11-15",
        end_date: "2025-11-20",
        location: "Sedona, Arizona",
        price: "1400",
        image_url: "images/DSC02661~3.JPG",
        retreat_slug: "desert-renewal-retreat-2025"
      }
    ];
    
    return res.json({
      success: true,
      retreats: mockRetreats
    });
  } catch (error) {
    console.error('Error preparing retreat data:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch featured retreats',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Public API endpoint for all retreats
app.get('/api/retreats', async (req, res) => {
  try {
    // Since the retreats table doesn't exist in SQLite yet, return the same mock data
    const mockRetreats = [
      {
        retreat_id: 1,
        title: "Mountain Serenity Retreat",
        description: "Escape to the majestic Blue Ridge Mountains for 5 days of yoga, meditation, hiking, and self-discovery.",
        start_date: "2025-06-10",
        end_date: "2025-06-15",
        location: "Blue Ridge Mountains",
        price: "1200",
        image_url: "images/DSC02638.JPG",
        retreat_slug: "mountain-serenity-retreat-2025"
      },
      {
        retreat_id: 2,
        title: "Coastal Bliss Retreat",
        description: "Immerse yourself in a week of beachside yoga, Caribbean sunshine, and Mayan cultural experiences.",
        start_date: "2025-09-05",
        end_date: "2025-09-12",
        location: "Tulum, Mexico",
        price: "1800",
        image_url: "images/DSC02646.JPG",
        retreat_slug: "coastal-bliss-retreat-2025"
      },
      {
        retreat_id: 3,
        title: "Desert Renewal Retreat",
        description: "Experience the magical healing energy of Sedona's red rocks with daily yoga, meditation, and vortex hikes.",
        start_date: "2025-11-15",
        end_date: "2025-11-20",
        location: "Sedona, Arizona",
        price: "1400",
        image_url: "images/DSC02661~3.JPG",
        retreat_slug: "desert-renewal-retreat-2025"
      }
    ];
    
    return res.json({
      success: true,
      retreats: mockRetreats
    });
  } catch (error) {
    console.error('Error preparing retreat data:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch retreats',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Public API endpoint for workshops
app.get('/api/workshops', async (req, res) => {
  try {
    // Use a direct query to match the actual SQLite schema
    const db = require('./database/db-config');
    const workshops = await db.query(`
      SELECT 
        workshop_id,
        title,
        description,
        date,
        start_time,
        end_time,
        instructor,
        capacity,
        price,
        early_bird_price as member_price, /* Use early_bird_price as substitute for member_price */
        location,
        title as workshop_slug, /* Use title as fallback for workshop_slug */
        active
      FROM workshops
      WHERE date >= date('now')
      ORDER BY date, start_time
      LIMIT 10
    `);
    
    // Format the response to match the expected structure
    return res.json({
      success: true,
      workshops: workshops.map(workshop => ({
        ...workshop,
        workshop_slug: workshop.title.toLowerCase().replace(/\s+/g, '-') // Generate slug from title
      }))
    });
  } catch (error) {
    console.error('Error fetching workshops:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch workshops',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Public API endpoint for website settings (for homepage)
app.get('/api/website-settings', async (req, res) => {
  try {
    const { WebsiteSettingsOperations } = require('./database/data-access');
    const settings = await WebsiteSettingsOperations.getSettings();
    
    return res.json({
      success: true,
      settings
    });
  } catch (error) {
    console.error('Error fetching website settings:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch website settings',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Register API routes
app.use('/api/admin', authenticateToken, adminRoutes);
app.use('/api/admin', authenticateToken, adminSettingsRoutes);
app.use('/api/admin', authenticateToken, adminPricingRoutes);
app.use('/api/admin', authenticateToken, adminCustomerDashboardRoutes);
app.use('/api', adminPricingRoutes); // For public pricing endpoint
app.use('/api/gallery', galleryRoutes); // Gallery routes for both public and admin

// Fallback route for SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

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

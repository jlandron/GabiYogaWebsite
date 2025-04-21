/**
 * Admin Settings API for Gabi Jyoti Yoga Website
 * 
 * This file provides API endpoints for managing website settings
 * including about section content, certifications, and homepage section visibility.
 */

const express = require('express');
const router = express.Router();
const db = require('../database/data-access');
const path = require('path');
const multer = require('multer');
const fs = require('fs');

// Authentication middleware to ensure user is admin
const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin privileges required.'
    });
  }
  next();
};

// Configure storage for profile photos
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../images/'));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'profile-' + uniqueSuffix + ext);
  }
});

// Configure upload with file filter for images
const upload = multer({
  storage: storage,
  fileFilter: function (req, file, cb) {
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif|webp)$/)) {
      return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
  },
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB max file size
});

/**
 * Get all website settings
 * GET /api/admin/settings
 */
router.get('/settings', requireAdmin, async (req, res) => {
  try {
    const { WebsiteSettingsOperations } = require('../database/data-access');
    const settings = await WebsiteSettingsOperations.getSettings();
    
    return res.json({
      success: true,
      settings
    });
  } catch (error) {
    console.error('Error fetching settings:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch settings',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * Update about information
 * PUT /api/admin/settings/about
 */
router.put('/settings/about', requireAdmin, async (req, res) => {
  try {
    const { name, subtitle, bio } = req.body;
    
    // Validation
    if (!name || !subtitle || !bio) {
      return res.status(400).json({
        success: false,
        message: 'Name, subtitle, and bio are required fields'
      });
    }
    
    // In a real application, update the database
    // For our demo, we'll just return the data
    const updatedAbout = { name, subtitle, bio };
    
    return res.json({
      success: true,
      message: 'About information updated successfully',
      about: updatedAbout
    });
  } catch (error) {
    console.error('Error updating about information:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update about information',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * Update profile photo
 * POST /api/admin/settings/profile-photo
 */
router.post('/settings/profile-photo', requireAdmin, upload.single('profilePhoto'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }
    
    // Get the filename of the uploaded image
    const filename = req.file.filename;
    const filePath = `images/${filename}`;
    
    // In a real application, update the database with the new file path
    // and potentially delete the old profile image
    
    return res.json({
      success: true,
      message: 'Profile photo updated successfully',
      profilePhoto: filePath
    });
  } catch (error) {
    console.error('Error updating profile photo:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update profile photo',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * Update certifications
 * PUT /api/admin/settings/certifications
 */
router.put('/settings/certifications', requireAdmin, async (req, res) => {
  try {
    const { certifications } = req.body;
    
    // Validation
    if (!Array.isArray(certifications)) {
      return res.status(400).json({
        success: false,
        message: 'Certifications must be an array'
      });
    }
    
    // In a real application, update the database
    // For our demo, we'll just return the data
    
    return res.json({
      success: true,
      message: 'Certifications updated successfully',
      certifications
    });
  } catch (error) {
    console.error('Error updating certifications:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update certifications',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * Update section toggles
 * PUT /api/admin/settings/section-toggles
 */
router.put('/settings/section-toggles', requireAdmin, async (req, res) => {
  try {
    const sectionToggles = req.body;
    
    // Validation
    const requiredToggles = [
      'groupClasses', 'privateLessons', 'workshops', 'retreats',
      'retreatsSection', 'scheduleSection', 'membershipSection', 'gallerySection'
    ];
    
    const missingToggles = requiredToggles.filter(toggle => sectionToggles[toggle] === undefined);
    
    if (missingToggles.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required toggles: ${missingToggles.join(', ')}`
      });
    }
    
    // In a real application, update the database
    // For our demo, we'll just return the data
    
    return res.json({
      success: true,
      message: 'Section toggles updated successfully',
      sectionToggles
    });
  } catch (error) {
    console.error('Error updating section toggles:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update section toggles',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * Update contact information
 * PUT /api/admin/settings/contact
 */
router.put('/settings/contact', requireAdmin, async (req, res) => {
  try {
    const { address, phone, email, socialMedia } = req.body;
    
    // Validation
    if (!address || !phone || !email || !socialMedia) {
      return res.status(400).json({
        success: false,
        message: 'Address, phone, email, and social media are required fields'
      });
    }
    
    // Validate social media object has required fields
    if (!socialMedia.facebook || !socialMedia.instagram || !socialMedia.youtube) {
      return res.status(400).json({
        success: false,
        message: 'All social media fields (facebook, instagram, youtube) are required'
      });
    }
    
    // In a real application, update the database
    // For our demo, we'll just return the data
    const contactInfo = { address, phone, email, socialMedia };
    
    return res.json({
      success: true,
      message: 'Contact information updated successfully',
      contactInfo
    });
  } catch (error) {
    console.error('Error updating contact information:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update contact information',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * Update all settings at once
 * PUT /api/admin/settings
 */
router.put('/settings', requireAdmin, async (req, res) => {
  try {
    const { about, certifications, sectionToggles, contactInfo } = req.body;
    
    // Validation
    if (!about || !certifications || !sectionToggles || !contactInfo) {
      return res.status(400).json({
        success: false,
        message: 'All sections (about, certifications, sectionToggles, contactInfo) are required'
      });
    }
    
    // Save settings to the database
    const settings = { about, certifications, sectionToggles, contactInfo };
    const { WebsiteSettingsOperations } = require('../database/data-access');
    const savedSettings = await WebsiteSettingsOperations.saveSettings(settings);
    
    return res.json({
      success: true,
      message: 'All settings updated successfully',
      settings: savedSettings
    });
  } catch (error) {
    console.error('Error updating settings:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update settings',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;

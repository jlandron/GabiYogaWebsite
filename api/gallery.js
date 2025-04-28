/**
 * Gallery API
 * Handles uploading, retrieving, updating, and deleting gallery images
 * Images are stored in the file system (development) or S3 (production)
 */

const express = require('express');
const router = express.Router();
const path = require('path');
const { query } = require('../database/db-config');
const { authenticateToken } = require('./auth');
const logger = require('../utils/logger');
const imageStorage = require('../utils/image-storage');

// Ensure the file_path column exists in the gallery_images table
const ensureFilePathColumn = async () => {
  try {
    const NODE_ENV = process.env.NODE_ENV || 'development';
    const DB_TYPE = process.env.DB_TYPE || (NODE_ENV === 'production' ? 'mysql' : 'sqlite');
    
    // Check if column already exists
    let columnExists = false;
    
    if (DB_TYPE === 'sqlite') {
      // For SQLite
      const result = await query(`PRAGMA table_info(gallery_images)`);
      
      if (Array.isArray(result)) {
        columnExists = result.some(column => column && column.name === 'file_path');
      } else if (result && typeof result === 'object' && 'length' in result) {
        for (let i = 0; i < result.length; i++) {
          if (result[i] && result[i].name === 'file_path') {
            columnExists = true;
            break;
          }
        }
      }
    } else {
      // For MySQL
      try {
        const result = await query(`
          SELECT COUNT(*) as count 
          FROM information_schema.columns 
          WHERE table_schema = DATABASE() 
          AND table_name = 'gallery_images'
          AND column_name = 'file_path'
        `);
        
        columnExists = result && result[0] && result[0].count > 0;
      } catch (error) {
        logger.warn('Error checking for file_path column:', { error: error.message });
      }
    }
    
    if (!columnExists) {
      logger.info('Adding file_path column to gallery_images table');
      await query(`ALTER TABLE gallery_images ADD COLUMN file_path TEXT`);
      logger.info('file_path column added successfully');
    }
    
    return true;
  } catch (error) {
    logger.error('Error ensuring file_path column exists:', { error: error.message, stack: error.stack });
    // Don't throw - let the app continue even if this fails
    return false;
  }
};

// Call this when the module is loaded to ensure the column exists
ensureFilePathColumn()
  .then(() => {
    logger.info('Gallery API initialized with file_path column check');
  })
  .catch(error => {
    logger.error('Error during gallery API initialization:', { error: error.message });
  });

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

// Get all gallery images
router.get('/images', async (req, res) => {
  try {
    const images = await query(`
      SELECT image_id, title, description, alt_text, caption, tags,
        mime_type, size, width, height, is_profile_photo, show_on_homepage,
        display_order, active, file_path, created_at, updated_at
      FROM gallery_images 
      WHERE active = 1
      ORDER BY display_order ASC, created_at DESC
    `);
    
    // Add URL field for each image
    const imagesWithUrls = await Promise.all(images.map(async (image) => {
      try {
        if (image.file_path) {
          image.url = await imageStorage.getPresignedUrl(image.file_path);
        }
        return image;
      } catch (err) {
        logger.error(`Error generating URL for image ${image.image_id}:`, { error: err.message });
        image.url = null;
        return image;
      }
    }));
    
    res.json({ images: imagesWithUrls });
  } catch (error) {
    logger.error('Error fetching gallery images:', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to fetch gallery images' });
  }
});

// Get images for homepage display
router.get('/images/homepage', async (req, res) => {
  try {
    const images = await query(`
      SELECT image_id, title, description, alt_text, caption, tags,
        mime_type, size, width, height, file_path
      FROM gallery_images 
      WHERE active = 1 AND show_on_homepage = 1
      ORDER BY display_order ASC, created_at DESC
    `);
    
    // Add URL field for each image
    const imagesWithUrls = await Promise.all(images.map(async (image) => {
      try {
        if (image.file_path) {
          image.url = await imageStorage.getPresignedUrl(image.file_path);
        }
        return image;
      } catch (err) {
        logger.error(`Error generating URL for image ${image.image_id}:`, { error: err.message });
        image.url = null;
        return image;
      }
    }));
    
    res.json({ images: imagesWithUrls });
  } catch (error) {
    logger.error('Error fetching homepage images:', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to fetch homepage images' });
  }
});

// Get a single image with metadata
router.get('/images/:id', async (req, res) => {
  try {
    const [image] = await query(`
      SELECT image_id, title, description, alt_text, caption, tags,
        mime_type, size, width, height, is_profile_photo, show_on_homepage,
        display_order, active, file_path, created_at, updated_at
      FROM gallery_images WHERE image_id = ?
    `, [req.params.id]);
    
    if (!image) {
      return res.status(404).json({ error: 'Image not found' });
    }
    
    // Add URL if file path exists
    if (image.file_path) {
      try {
        image.url = await imageStorage.getPresignedUrl(image.file_path);
      } catch (err) {
        logger.error(`Error generating URL for image ${image.image_id}:`, { error: err.message });
        image.url = null;
      }
    }
    
    res.json({ image });
  } catch (error) {
    logger.error('Error fetching image:', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to fetch image' });
  }
});

// Get image data as binary for display
router.get('/images/:id/data', async (req, res) => {
  try {
    logger.debug(`Fetching image data for ID: ${req.params.id}`);
    
    const [image] = await query(`
      SELECT file_path, mime_type, size FROM gallery_images WHERE image_id = ?
    `, [req.params.id]);
    
    if (!image) {
      return res.status(404).json({ error: 'Image not found' });
    }
    
    if (!image.file_path) {
      logger.error(`Image ${req.params.id} exists but has no file path`);
      return res.status(404).json({ error: 'Image has no file path' });
    }
    
    try {
      // Retrieve image data from file storage
      const imageBuffer = await imageStorage.retrieveImage(image.file_path);
      
      // Set proper headers for the image
      res.setHeader('Content-Type', image.mime_type);
      res.setHeader('Content-Length', imageBuffer.length);
      res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours
      
      // Send the image buffer
      res.send(imageBuffer);
      
      logger.debug(`Successfully sent image ${req.params.id} (${imageBuffer.length} bytes)`);
    } catch (retrieveError) {
      logger.error(`Error retrieving image file for ID ${req.params.id}:`, { error: retrieveError.message, stack: retrieveError.stack });
      return res.status(500).json({ error: 'Failed to retrieve image file' });
    }
  } catch (error) {
    logger.error(`Error fetching image data for ID ${req.params.id}:`, { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to fetch image data' });
  }
});

// Get profile photo image data
router.get('/profile-photo', async (req, res) => {
  try {
    logger.debug('Fetching profile photo image data');
    
    const [profilePhoto] = await query(`
      SELECT file_path, mime_type, size, image_id
      FROM gallery_images 
      WHERE is_profile_photo = 1 
      LIMIT 1
    `);
    
    if (!profilePhoto) {
      return res.status(404).json({ error: 'Profile photo not found' });
    }
    
    if (!profilePhoto.file_path) {
      logger.error('Profile photo exists but has no file path');
      return res.status(404).json({ error: 'Profile photo has no file path' });
    }
    
    try {
      // Retrieve image data from file storage
      const imageBuffer = await imageStorage.retrieveImage(profilePhoto.file_path);
      
      // Set proper headers for the image
      res.setHeader('Content-Type', profilePhoto.mime_type);
      res.setHeader('Content-Length', imageBuffer.length);
      res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours
      
      // Send the image buffer
      res.send(imageBuffer);
      
      logger.debug(`Successfully sent profile photo (ID: ${profilePhoto.image_id}, ${imageBuffer.length} bytes)`);
    } catch (retrieveError) {
      logger.error('Error retrieving profile photo file:', { error: retrieveError.message, stack: retrieveError.stack });
      return res.status(500).json({ error: 'Failed to retrieve profile photo file' });
    }
  } catch (error) {
    logger.error('Error fetching profile photo:', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to fetch profile photo' });
  }
});

// Admin routes below require authentication
// Upload a new image
router.post('/images', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { 
      title, 
      description, 
      alt_text, 
      caption, 
      tags, 
      image_data, 
      mime_type,
      size,
      width,
      height,
      is_profile_photo,
      show_on_homepage
    } = req.body;
    
    // Validate required fields
    if (!image_data || !mime_type) {
      return res.status(400).json({ error: 'Image data and mime type are required' });
    }
    
    // If this is a profile photo, unset any existing profile photo
    if (is_profile_photo) {
      await query(`
        UPDATE gallery_images SET is_profile_photo = 0 WHERE is_profile_photo = 1
      `);
    }
    
    // Process the image data with validation
    let imageBuffer;
    let originalFilename = 'image.jpg';
    
    try {
      // Extract base64 data properly
      const base64Data = image_data.split(',')[1]; 
      
      // Validate base64 data exists
      if (!base64Data) {
        return res.status(400).json({ error: 'Invalid image data format' });
      }
      
      // Convert to buffer with validation
      imageBuffer = Buffer.from(base64Data, 'base64');
      
      // Basic verification to check if buffer size makes sense
      // Expecting decoded buffer to be ~75% of the base64 string length
      const expectedSize = Math.floor(base64Data.length * 0.75);
      const actualSize = imageBuffer.length;
      
      logger.debug(`Image processing - Expected: ~${expectedSize} bytes, Actual: ${actualSize} bytes`);
      
      if (Math.abs(expectedSize - actualSize) > expectedSize * 0.1) {
        logger.warn(`Possible data integrity issue - size mismatch: expected ~${expectedSize}, got ${actualSize}`);
      }
      
      // Enforce maximum size
      const maxSize = 8 * 1024 * 1024; // 8MB max
      if (imageBuffer.length > maxSize) {
        return res.status(400).json({ error: 'Image size exceeds the maximum allowed size of 8MB' });
      }
      
      // Create a filename from title if available
      if (title) {
        originalFilename = `${title.toLowerCase().replace(/[^a-z0-9]/gi, '-')}.jpg`;
      }
    } catch (error) {
      logger.error('Error processing image data:', { error: error.message, stack: error.stack });
      return res.status(400).json({ error: 'Failed to process image data' });
    }
    
    // Store the image file
    let imageInfo;
    try {
      imageInfo = await imageStorage.storeImage(
        imageBuffer, 
        originalFilename, 
        mime_type
      );
      
      logger.debug('Image stored successfully:', { filePath: imageInfo.filePath, url: imageInfo.url });
    } catch (storageError) {
      logger.error('Error storing image:', { error: storageError.message, stack: storageError.stack });
      return res.status(500).json({ error: 'Failed to store image file' });
    }
    
    // Insert new image record in database
    const now = new Date().toISOString();
    const result = await query(`
      INSERT INTO gallery_images (
        title, description, alt_text, caption, tags, file_path,
        mime_type, size, width, height, is_profile_photo, show_on_homepage,
        active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
    `, [
      title || null, 
      description || null, 
      alt_text || null, 
      caption || null, 
      JSON.stringify(tags || []), 
      imageInfo.filePath, // Store file path rather than binary data
      mime_type,
      imageBuffer.length, // Actual size
      width || null,
      height || null,
      is_profile_photo ? 1 : 0,
      show_on_homepage ? 1 : 0,
      now,
      now
    ]);
    
    res.status(201).json({ 
      message: 'Image uploaded successfully', 
      image_id: result.lastID,
      file_path: imageInfo.filePath,
      url: imageInfo.url
    });
  } catch (error) {
    logger.error('Error uploading image:', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to upload image' });
  }
});

// Update an image
router.put('/images/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { 
      title, 
      description, 
      alt_text, 
      caption, 
      tags,
      is_profile_photo,
      show_on_homepage,
      active,
      display_order
    } = req.body;
    
    const [existingImage] = await query(`
      SELECT * FROM gallery_images WHERE image_id = ?
    `, [req.params.id]);
    
    if (!existingImage) {
      return res.status(404).json({ error: 'Image not found' });
    }
    
    // If setting as profile photo, unset any existing profile photo
    if (is_profile_photo) {
      await query(`
        UPDATE gallery_images SET is_profile_photo = 0 WHERE is_profile_photo = 1
      `);
    }
    
    // Update image details
    const now = new Date().toISOString();
    await query(`
      UPDATE gallery_images SET
        title = ?,
        description = ?,
        alt_text = ?,
        caption = ?,
        tags = ?,
        is_profile_photo = ?,
        show_on_homepage = ?,
        active = ?,
        display_order = ?,
        updated_at = ?
      WHERE image_id = ?
    `, [
      title || existingImage.title,
      description || existingImage.description,
      alt_text || existingImage.alt_text,
      caption || existingImage.caption,
      JSON.stringify(tags || []),
      is_profile_photo ? 1 : 0,
      show_on_homepage ? 1 : 0,
      active !== undefined ? active : existingImage.active,
      display_order !== undefined ? display_order : existingImage.display_order,
      now,
      req.params.id
    ]);
    
    res.json({ message: 'Image updated successfully' });
  } catch (error) {
    logger.error('Error updating image:', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to update image' });
  }
});

// Get profile photo URL - for frontend use
router.get('/profile-photo-url', async (req, res) => {
  try {
    logger.debug('Fetching profile photo URL');
    
    const [profilePhoto] = await query(`
      SELECT file_path, image_id
      FROM gallery_images 
      WHERE is_profile_photo = 1 
      LIMIT 1
    `);
    
    if (!profilePhoto) {
      return res.status(404).json({ 
        success: false,
        error: 'Profile photo not found' 
      });
    }
    
    if (!profilePhoto.file_path) {
      logger.error('Profile photo exists but has no file path');
      return res.status(404).json({ 
        success: false,
        error: 'Profile photo has no file path' 
      });
    }
    
    try {
      // Generate URL for the profile photo
      const url = await imageStorage.getPresignedUrl(profilePhoto.file_path);
      
      res.json({
        success: true,
        url,
        image_id: profilePhoto.image_id
      });
      
      logger.debug(`Generated URL for profile photo (ID: ${profilePhoto.image_id})`);
    } catch (error) {
      logger.error('Error generating URL for profile photo:', { error: error.message, stack: error.stack });
      return res.status(500).json({ 
        success: false,
        error: 'Failed to generate URL for profile photo' 
      });
    }
  } catch (error) {
    logger.error('Error fetching profile photo URL:', { error: error.message, stack: error.stack });
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch profile photo URL' 
    });
  }
});

// Delete an image
router.delete('/images/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const [image] = await query(`
      SELECT is_profile_photo, file_path FROM gallery_images WHERE image_id = ?
    `, [req.params.id]);
    
    if (!image) {
      return res.status(404).json({ error: 'Image not found' });
    }
    
    // Delete the image file if it exists
    if (image.file_path) {
      try {
        await imageStorage.deleteImage(image.file_path);
        logger.debug(`Deleted image file: ${image.file_path}`);
      } catch (deleteError) {
        logger.error(`Error deleting image file ${image.file_path}:`, { 
          error: deleteError.message, 
          stack: deleteError.stack
        });
        // Continue with database deletion even if file deletion failed
      }
    }
    
    // Delete the database record
    await query(`DELETE FROM gallery_images WHERE image_id = ?`, [req.params.id]);
    
    res.json({ 
      message: 'Image deleted successfully',
      was_profile_photo: image.is_profile_photo === 1
    });
  } catch (error) {
    logger.error('Error deleting image:', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to delete image' });
  }
});

module.exports = router;

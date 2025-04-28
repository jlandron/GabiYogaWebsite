/**
 * Gallery API
 * Handles uploading, retrieving, updating, and deleting gallery images in the database
 */

const express = require('express');
const router = express.Router();
const { query } = require('../database/db-config');
const { authenticateToken } = require('./auth');

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
        display_order, active, created_at, updated_at
      FROM gallery_images 
      WHERE active = 1
      ORDER BY display_order ASC, created_at DESC
    `);
    
    res.json({ images });
  } catch (error) {
    console.error('Error fetching gallery images:', error);
    res.status(500).json({ error: 'Failed to fetch gallery images' });
  }
});

// Get images for homepage display
router.get('/images/homepage', async (req, res) => {
  try {
    const images = await query(`
      SELECT image_id, title, description, alt_text, caption, tags,
        mime_type, size, width, height
      FROM gallery_images 
      WHERE active = 1 AND show_on_homepage = 1
      ORDER BY display_order ASC, created_at DESC
    `);
    
    res.json({ images });
  } catch (error) {
    console.error('Error fetching homepage images:', error);
    res.status(500).json({ error: 'Failed to fetch homepage images' });
  }
});

// Get a single image with image data
router.get('/images/:id', async (req, res) => {
  try {
    const [image] = await query(`
      SELECT * FROM gallery_images WHERE image_id = ?
    `, [req.params.id]);
    
    if (!image) {
      return res.status(404).json({ error: 'Image not found' });
    }
    
    res.json({ image });
  } catch (error) {
    console.error('Error fetching image:', error);
    res.status(500).json({ error: 'Failed to fetch image' });
  }
});

// Get image data as binary for display
router.get('/images/:id/data', async (req, res) => {
  try {
    console.log(`Fetching image data for ID: ${req.params.id}`);
    
    const [image] = await query(`
      SELECT image_data, mime_type, size FROM gallery_images WHERE image_id = ?
    `, [req.params.id]);
    
    if (!image) {
      return res.status(404).json({ error: 'Image not found' });
    }
    
    if (!image.image_data) {
      console.error(`Image ${req.params.id} exists but has no data`);
      return res.status(404).json({ error: 'Image has no data' });
    }
    
    // Validate image data before sending
    try {
      // Even though image_data is already a Buffer, we create a new one to ensure integrity
      const imageBuffer = Buffer.from(image.image_data);
      
      // Check if the buffer size matches expected size
      if (imageBuffer.length !== image.size) {
        console.warn(`Image ${req.params.id} size mismatch: Expected ${image.size}, got ${imageBuffer.length}`);
      }
      
      // Set proper headers for the image
      res.setHeader('Content-Type', image.mime_type);
      res.setHeader('Content-Length', imageBuffer.length);
      res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours
      
      // Send the image buffer directly instead of creating a new Buffer
      res.send(imageBuffer);
      
      console.log(`Successfully sent image ${req.params.id} (${imageBuffer.length} bytes)`);
    } catch (bufferError) {
      console.error(`Error processing image buffer for ID ${req.params.id}:`, bufferError);
      return res.status(500).json({ error: 'Image data is corrupt or invalid' });
    }
  } catch (error) {
    console.error(`Error fetching image data for ID ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to fetch image data' });
  }
});

// Get profile photo image data
router.get('/profile-photo', async (req, res) => {
  try {
    console.log('Fetching profile photo image data');
    
    const [profilePhoto] = await query(`
      SELECT image_data, mime_type, size, image_id
      FROM gallery_images 
      WHERE is_profile_photo = 1 
      LIMIT 1
    `);
    
    if (!profilePhoto) {
      return res.status(404).json({ error: 'Profile photo not found' });
    }
    
    if (!profilePhoto.image_data) {
      console.error('Profile photo exists but has no data');
      return res.status(404).json({ error: 'Profile photo has no data' });
    }
    
    // Validate image data before sending
    try {
      const imageBuffer = Buffer.from(profilePhoto.image_data);
      
      // Check if the buffer size matches expected size
      if (profilePhoto.size && imageBuffer.length !== profilePhoto.size) {
        console.warn(`Profile photo size mismatch: Expected ${profilePhoto.size}, got ${imageBuffer.length}`);
      }
      
      // Set proper headers for the image
      res.setHeader('Content-Type', profilePhoto.mime_type);
      res.setHeader('Content-Length', imageBuffer.length);
      res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours
      
      // Send the image buffer
      res.send(imageBuffer);
      
      console.log(`Successfully sent profile photo (ID: ${profilePhoto.image_id}, ${imageBuffer.length} bytes)`);
    } catch (bufferError) {
      console.error('Error processing profile photo buffer:', bufferError);
      return res.status(500).json({ error: 'Profile photo data is corrupt or invalid' });
    }
  } catch (error) {
    console.error('Error fetching profile photo:', error);
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
    if (!image_data || !mime_type || !size) {
      return res.status(400).json({ error: 'Image data, mime type, and size are required' });
    }
    
    // If this is a profile photo, unset any existing profile photo
    if (is_profile_photo) {
      await query(`
        UPDATE gallery_images SET is_profile_photo = 0 WHERE is_profile_photo = 1
      `);
    }
    
    // Process the image data with validation
    let imageBuffer;
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
      
      console.log(`Image processing - Expected: ~${expectedSize} bytes, Actual: ${actualSize} bytes`);
      
      if (Math.abs(expectedSize - actualSize) > expectedSize * 0.1) {
        console.warn(`Possible data integrity issue - size mismatch: expected ~${expectedSize}, got ${actualSize}`);
      }
      
      // Enforce maximum size
      const maxSize = 8 * 1024 * 1024; // 8MB max
      if (imageBuffer.length > maxSize) {
        return res.status(400).json({ error: 'Image size exceeds the maximum allowed size of 8MB' });
      }
    } catch (error) {
      console.error('Error processing image data:', error);
      return res.status(400).json({ error: 'Failed to process image data' });
    }
    
    // Insert new image
    const now = new Date().toISOString();
    const result = await query(`
      INSERT INTO gallery_images (
        title, description, alt_text, caption, tags, image_data, 
        mime_type, size, width, height, is_profile_photo, show_on_homepage,
        active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
    `, [
      title || null, 
      description || null, 
      alt_text || null, 
      caption || null, 
      JSON.stringify(tags || []), 
      imageBuffer, // Use the validated buffer
      mime_type,
      imageBuffer.length, // Use actual buffer length, not reported size
      width || null,
      height || null,
      is_profile_photo ? 1 : 0,
      show_on_homepage ? 1 : 0,
      now,
      now
    ]);
    
    res.status(201).json({ 
      message: 'Image uploaded successfully', 
      image_id: result.lastID 
    });
  } catch (error) {
    console.error('Error uploading image:', error);
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
    console.error('Error updating image:', error);
    res.status(500).json({ error: 'Failed to update image' });
  }
});

// Delete an image
router.delete('/images/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const [image] = await query(`
      SELECT is_profile_photo FROM gallery_images WHERE image_id = ?
    `, [req.params.id]);
    
    if (!image) {
      return res.status(404).json({ error: 'Image not found' });
    }
    
    await query(`DELETE FROM gallery_images WHERE image_id = ?`, [req.params.id]);
    
    res.json({ 
      message: 'Image deleted successfully',
      was_profile_photo: image.is_profile_photo === 1
    });
  } catch (error) {
    console.error('Error deleting image:', error);
    res.status(500).json({ error: 'Failed to delete image' });
  }
});

module.exports = router;

/**
 * Admin Pricing API for Gabi Jyoti Yoga Website
 * 
 * This file provides API endpoints for managing pricing and offerings
 * including memberships, packages, and private sessions.
 */

const express = require('express');
const router = express.Router();
const { query } = require('../database/db-config');

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

/**
 * Get all membership types
 * GET /api/admin/pricing/memberships
 */
router.get('/pricing/memberships', requireAdmin, async (req, res) => {
  try {
    // Query for all membership types
    const memberships = await query(`
      SELECT 
        m.id,
        m.type,
        m.description,
        m.price,
        m.duration_days,
        m.classes,
        m.auto_renew_allowed,
        m.most_popular,
        m.status
      FROM membership_types m
      ORDER BY m.price
    `);
    
    return res.json({
      success: true,
      memberships
    });
  } catch (error) {
    console.error('Error fetching memberships:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch memberships',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * Create new membership type
 * POST /api/admin/pricing/memberships
 */
router.post('/pricing/memberships', requireAdmin, async (req, res) => {
  try {
    const {
      type,
      description,
      price,
      duration_days,
      classes,
      auto_renew_allowed,
      most_popular,
      status = 'active'
    } = req.body;
    
    // Validation
    if (!type || price === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Membership type and price are required'
      });
    }
    
    // Insert new membership type
    const now = new Date().toISOString();
    
    // If this membership is being set as "most popular", remove that flag from all other memberships
    if (most_popular) {
      await query(`UPDATE membership_types SET most_popular = 0`);
    }
    
    const result = await query(`
      INSERT INTO membership_types (
        type,
        description,
        price,
        duration_days,
        classes,
        auto_renew_allowed,
        most_popular,
        status,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      type,
      description || null,
      price,
      duration_days || null,
      classes || null,
      auto_renew_allowed ? 1 : 0,
      most_popular ? 1 : 0,
      status,
      now,
      now
    ]);
    
    // Get the newly created membership
    const newMembership = await query(`
      SELECT 
        m.id,
        m.type,
        m.description,
        m.price,
        m.duration_days,
        m.classes,
        m.auto_renew_allowed,
        m.most_popular,
        m.status
      FROM membership_types m
      WHERE m.id = ?
    `, [result.lastID]);
    
    return res.status(201).json({
      success: true,
      message: 'Membership type created successfully',
      membership: newMembership[0]
    });
  } catch (error) {
    console.error('Error creating membership type:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create membership type',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * Update membership type
 * PUT /api/admin/pricing/memberships/:id
 */
router.put('/pricing/memberships/:id', requireAdmin, async (req, res) => {
  try {
    const membershipId = req.params.id;
    const {
      type,
      description,
      price,
      duration_days,
      classes,
      auto_renew_allowed,
      most_popular,
      status
    } = req.body;
    
    // Validation
    if (!type || price === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Membership type and price are required'
      });
    }
    
    // Check if membership exists
    const existingMembership = await query(`
      SELECT id FROM membership_types WHERE id = ?
    `, [membershipId]);
    
    if (existingMembership.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Membership type not found'
      });
    }
    
    // Update membership type
    const now = new Date().toISOString();
    
    // If this membership is being set as "most popular", remove that flag from all other memberships
    if (most_popular) {
      await query(`UPDATE membership_types SET most_popular = 0 WHERE id != ?`, [membershipId]);
    }
    
    await query(`
      UPDATE membership_types
      SET 
        type = ?,
        description = ?,
        price = ?,
        duration_days = ?,
        classes = ?,
        auto_renew_allowed = ?,
        most_popular = ?,
        status = ?,
        updated_at = ?
      WHERE id = ?
    `, [
      type,
      description || null,
      price,
      duration_days || null,
      classes || null,
      auto_renew_allowed ? 1 : 0,
      most_popular ? 1 : 0,
      status,
      now,
      membershipId
    ]);
    
    // Get the updated membership
    const updatedMembership = await query(`
      SELECT 
        m.id,
        m.type,
        m.description,
        m.price,
        m.duration_days,
        m.classes,
        m.auto_renew_allowed,
        m.most_popular,
        m.status
      FROM membership_types m
      WHERE m.id = ?
    `, [membershipId]);
    
    return res.json({
      success: true,
      message: 'Membership type updated successfully',
      membership: updatedMembership[0]
    });
  } catch (error) {
    console.error('Error updating membership type:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update membership type',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * Delete membership type
 * DELETE /api/admin/pricing/memberships/:id
 */
router.delete('/pricing/memberships/:id', requireAdmin, async (req, res) => {
  try {
    const membershipId = req.params.id;
    
    // Check if membership exists
    const existingMembership = await query(`
      SELECT id FROM membership_types WHERE id = ?
    `, [membershipId]);
    
    if (existingMembership.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Membership type not found'
      });
    }
    
    // Delete membership type
    await query(`DELETE FROM membership_types WHERE id = ?`, [membershipId]);
    
    return res.json({
      success: true,
      message: 'Membership type deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting membership type:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete membership type',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * Get all private session packages
 * GET /api/admin/pricing/session-packages
 */
router.get('/pricing/session-packages', requireAdmin, async (req, res) => {
  try {
    // Query for all session packages
    const packages = await query(`
      SELECT 
        p.id,
        p.name,
        p.description,
        p.sessions,
        p.price,
        p.session_duration,
        p.focus_options,
        p.status
      FROM session_packages p
      ORDER BY p.sessions, p.price
    `);
    
    // Parse focus_options JSON
    const formattedPackages = packages.map(pkg => ({
      ...pkg,
      focus_options: JSON.parse(pkg.focus_options || '[]')
    }));
    
    return res.json({
      success: true,
      packages: formattedPackages
    });
  } catch (error) {
    console.error('Error fetching session packages:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch session packages',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * Create new session package
 * POST /api/admin/pricing/session-packages
 */
router.post('/pricing/session-packages', requireAdmin, async (req, res) => {
  try {
    const {
      name,
      description,
      sessions,
      price,
      session_duration,
      focus_options,
      status = 'active'
    } = req.body;
    
    // Validation
    if (!name || !sessions || price === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Package name, number of sessions, and price are required'
      });
    }
    
    // Insert new session package
    const now = new Date().toISOString();
    const focusOptionsJSON = JSON.stringify(focus_options || []);
    
    const result = await query(`
      INSERT INTO session_packages (
        name,
        description,
        sessions,
        price,
        session_duration,
        focus_options,
        status,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      name,
      description || null,
      sessions,
      price,
      session_duration || 60,
      focusOptionsJSON,
      status,
      now,
      now
    ]);
    
    // Get the newly created package
    const newPackage = await query(`
      SELECT 
        p.id,
        p.name,
        p.description,
        p.sessions,
        p.price,
        p.session_duration,
        p.focus_options,
        p.status
      FROM session_packages p
      WHERE p.id = ?
    `, [result.lastID]);
    
    // Parse focus_options JSON for the response
    if (newPackage.length > 0) {
      newPackage[0].focus_options = JSON.parse(newPackage[0].focus_options || '[]');
    }
    
    return res.status(201).json({
      success: true,
      message: 'Session package created successfully',
      package: newPackage[0]
    });
  } catch (error) {
    console.error('Error creating session package:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create session package',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * Update session package
 * PUT /api/admin/pricing/session-packages/:id
 */
router.put('/pricing/session-packages/:id', requireAdmin, async (req, res) => {
  try {
    const packageId = req.params.id;
    const {
      name,
      description,
      sessions,
      price,
      session_duration,
      focus_options,
      status
    } = req.body;
    
    // Validation
    if (!name || !sessions || price === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Package name, number of sessions, and price are required'
      });
    }
    
    // Check if package exists
    const existingPackage = await query(`
      SELECT id FROM session_packages WHERE id = ?
    `, [packageId]);
    
    if (existingPackage.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Session package not found'
      });
    }
    
    // Update session package
    const now = new Date().toISOString();
    const focusOptionsJSON = JSON.stringify(focus_options || []);
    
    await query(`
      UPDATE session_packages
      SET 
        name = ?,
        description = ?,
        sessions = ?,
        price = ?,
        session_duration = ?,
        focus_options = ?,
        status = ?,
        updated_at = ?
      WHERE id = ?
    `, [
      name,
      description || null,
      sessions,
      price,
      session_duration || 60,
      focusOptionsJSON,
      status,
      now,
      packageId
    ]);
    
    // Get the updated package
    const updatedPackage = await query(`
      SELECT 
        p.id,
        p.name,
        p.description,
        p.sessions,
        p.price,
        p.session_duration,
        p.focus_options,
        p.status
      FROM session_packages p
      WHERE p.id = ?
    `, [packageId]);
    
    // Parse focus_options JSON for the response
    if (updatedPackage.length > 0) {
      updatedPackage[0].focus_options = JSON.parse(updatedPackage[0].focus_options || '[]');
    }
    
    return res.json({
      success: true,
      message: 'Session package updated successfully',
      package: updatedPackage[0]
    });
  } catch (error) {
    console.error('Error updating session package:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update session package',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * Delete session package
 * DELETE /api/admin/pricing/session-packages/:id
 */
router.delete('/pricing/session-packages/:id', requireAdmin, async (req, res) => {
  try {
    const packageId = req.params.id;
    
    // Check if package exists
    const existingPackage = await query(`
      SELECT id FROM session_packages WHERE id = ?
    `, [packageId]);
    
    if (existingPackage.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Session package not found'
      });
    }
    
    // Delete session package
    await query(`DELETE FROM session_packages WHERE id = ?`, [packageId]);
    
    return res.json({
      success: true,
      message: 'Session package deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting session package:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete session package',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * Get public pricing data (for frontend)
 * GET /api/pricing
 * (Public endpoint, no auth required)
 */
router.get('/pricing', async (req, res) => {
  try {
    // Get active membership types
    const memberships = await query(`
      SELECT 
        type,
        description,
        price,
        duration_days,
        classes,
        auto_renew_allowed,
        most_popular,
        'active' as status
      FROM membership_types
      WHERE status = 'active'
      ORDER BY price
    `);
    
    // Get active session packages
    const packages = await query(`
      SELECT 
        name,
        description,
        sessions,
        price,
        session_duration,
        focus_options
      FROM session_packages
      WHERE status = 'active'
      ORDER BY sessions, price
    `);
    
    // Parse focus_options JSON
    const formattedPackages = packages.map(pkg => ({
      ...pkg,
      focus_options: JSON.parse(pkg.focus_options || '[]')
    }));
    
    // Use JSON.stringify and then parse to ensure proper JSON formatting
    const response = {
      success: true,
      pricing: {
        memberships: memberships,
        sessionPackages: formattedPackages
      }
    };
    
    return res.json(response);
  } catch (error) {
    console.error('Error fetching pricing data:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch pricing data',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;

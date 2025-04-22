/**
 * Admin Customer Dashboard API for Gabi Jyoti Yoga Website
 * 
 * This file provides API endpoints for the admin customer dashboard,
 * which allows the admin to view the dashboard as if they were a user
 */

const express = require('express');
const router = express.Router();
const db = require('../database/db-config');
const { AuthOperations } = require('../database/data-access');

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
 * Get admin profile information
 * GET /api/admin/profile
 */
router.get('/profile', requireAdmin, async (req, res) => {
  try {
    const adminData = await AuthOperations.getUserById(req.user.user_id);
    
    if (!adminData) {
      return res.status(404).json({
        success: false,
        message: 'Admin user not found'
      });
    }
    
    return res.json(adminData);
  } catch (error) {
    console.error('Error fetching admin profile:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch admin profile',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * Get admin bookings for customer dashboard
 * GET /api/admin/customer-dashboard/bookings
 */
router.get('/customer-dashboard/bookings', requireAdmin, async (req, res) => {
  try {
    const bookings = await db.query(`
      SELECT 
        b.booking_id,
        c.name as class_name,
        b.date,
        c.start_time,
        c.duration,
        c.instructor,
        b.status
      FROM bookings b
      JOIN classes c ON b.class_id = c.class_id
      WHERE b.user_id = ? AND b.date >= date('now') AND b.status = 'Confirmed'
      ORDER BY b.date ASC, c.start_time ASC
    `, [req.user.user_id]);
    
    return res.json(bookings);
  } catch (error) {
    console.error('Error fetching admin bookings:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch admin bookings',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * Get admin memberships for customer dashboard
 * GET /api/admin/customer-dashboard/memberships
 */
router.get('/customer-dashboard/memberships', requireAdmin, async (req, res) => {
  try {
    const memberships = await db.query(`
      SELECT 
        membership_id,
        membership_type,
        start_date,
        end_date,
        classes_remaining,
        auto_renew,
        status,
        price
      FROM memberships
      WHERE user_id = ? AND status = 'Active'
      ORDER BY start_date DESC
    `, [req.user.user_id]);
    
    return res.json(memberships);
  } catch (error) {
    console.error('Error fetching admin memberships:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch admin memberships',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * Get admin payments for customer dashboard
 * GET /api/admin/customer-dashboard/payments
 */
router.get('/customer-dashboard/payments', requireAdmin, async (req, res) => {
  try {
    const payments = await db.query(`
      SELECT 
        payment_id,
        amount,
        payment_date,
        payment_method,
        payment_reference,
        payment_type,
        related_id
      FROM payments
      WHERE user_id = ?
      ORDER BY payment_date DESC
      LIMIT 10
    `, [req.user.user_id]);
    
    return res.json(payments);
  } catch (error) {
    console.error('Error fetching admin payments:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch admin payments',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * Get admin workshops for customer dashboard
 * GET /api/admin/customer-dashboard/workshops
 */
router.get('/customer-dashboard/workshops', requireAdmin, async (req, res) => {
  try {
    // Get workshops the admin is registered for
    const registeredWorkshops = await db.query(`
      SELECT 
        w.workshop_id,
        w.title,
        w.description,
        w.date,
        w.start_time,
        w.end_time,
        w.location,
        w.price,
        w.member_price
      FROM workshops w
      JOIN workshop_registrations wr ON w.workshop_id = wr.workshop_id
      WHERE wr.user_id = ? AND w.date >= date('now')
      ORDER BY w.date ASC
    `, [req.user.user_id]);
    
    // Get other upcoming workshops
    const upcomingWorkshops = await db.query(`
      SELECT 
        w.workshop_id,
        w.title,
        w.description,
        w.date,
        w.start_time,
        w.end_time,
        w.location,
        w.price,
        w.member_price
      FROM workshops w
      WHERE w.workshop_id NOT IN (
        SELECT workshop_id FROM workshop_registrations WHERE user_id = ?
      )
      AND w.active = 1
      AND w.date >= date('now')
      ORDER BY w.date ASC
      LIMIT 3
    `, [req.user.user_id]);
    
    // Combine registered and upcoming workshops
    const workshops = [...registeredWorkshops, ...upcomingWorkshops];
    
    return res.json(workshops);
  } catch (error) {
    console.error('Error fetching admin workshops:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch admin workshops',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * Get admin retreats for customer dashboard
 * GET /api/admin/customer-dashboard/retreats
 */
router.get('/customer-dashboard/retreats', requireAdmin, async (req, res) => {
  try {
    // Get featured and upcoming retreats
    const retreats = await db.query(`
      SELECT 
        r.retreat_id,
        r.title,
        r.description,
        r.start_date,
        r.end_date,
        r.location,
        r.venue_name,
        r.price,
        r.member_price,
        r.image_url
      FROM retreats r
      WHERE r.active = 1
      AND r.start_date >= date('now')
      ORDER BY r.featured DESC, r.start_date ASC
      LIMIT 3
    `);
    
    return res.json(retreats);
  } catch (error) {
    console.error('Error fetching admin retreats:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch admin retreats',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * Get admin private sessions for customer dashboard
 * GET /api/admin/customer-dashboard/sessions
 */
router.get('/customer-dashboard/sessions', requireAdmin, async (req, res) => {
  try {
    const sessions = await db.query(`
      SELECT 
        session_id,
        date,
        start_time,
        duration,
        focus,
        package_type,
        price,
        location,
        status
      FROM private_sessions
      WHERE user_id = ? AND date >= date('now') AND status != 'Cancelled'
      ORDER BY date ASC, start_time ASC
    `, [req.user.user_id]);
    
    return res.json(sessions);
  } catch (error) {
    console.error('Error fetching admin private sessions:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch admin private sessions',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;

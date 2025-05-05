/**
 * API endpoints for the user dashboard
 * These endpoints provide user-specific data for the customer dashboard
 */

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('./auth');
const db = require('../database/db-config');
const { MemberOperations, BookingOperations, WorkshopOperations, RetreatOperations } = require('../database/data-access');
const { getDatetimeFunction } = require('../utils/db-helper');

/**
 * GET upcoming bookings for the current user
 */
router.get('/bookings/upcoming', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.user_id;
    
    // Fetch upcoming bookings for this user
    const bookings = await db.query(`
      SELECT 
        b.booking_id,
        c.name as class_name,
        c.level,
        b.date,
        c.start_time,
        c.duration,
        c.location,
        b.status
      FROM bookings b
      JOIN classes c ON b.class_id = c.class_id
      WHERE b.user_id = ?
        AND b.date >= date('now')
        AND b.status = 'Confirmed'
      ORDER BY b.date, c.start_time
    `, [userId]);
    
    res.json({ success: true, bookings });
  } catch (error) {
    console.error('Error fetching upcoming bookings:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch bookings' });
  }
});

/**
 * PUT cancel a booking
 */
router.put('/bookings/:id/cancel', authenticateToken, async (req, res) => {
  try {
    const bookingId = req.params.id;
    const userId = req.user.user_id;
    
    // First verify this booking belongs to this user
    const booking = await db.query(`
      SELECT * FROM bookings WHERE booking_id = ? AND user_id = ?
    `, [bookingId, userId]);
    
    if (booking.length === 0) {
      return res.status(404).json({ success: false, message: 'Booking not found or not authorized' });
    }
    
    // Update booking status
    await db.query(`
      UPDATE bookings
      SET status = 'Cancelled', updated_at = ${getDatetimeFunction()}
      WHERE booking_id = ?
    `, [bookingId]);
    
    res.json({ success: true, message: 'Booking cancelled successfully' });
  } catch (error) {
    console.error('Error cancelling booking:', error);
    res.status(500).json({ success: false, message: 'Failed to cancel booking' });
  }
});

/**
 * GET active memberships for the current user
 */
router.get('/memberships/active', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.user_id;
    
    // Fetch active memberships
    const memberships = await db.query(`
      SELECT 
        membership_id,
        membership_type,
        start_date,
        end_date,
        classes_remaining,
        auto_renew,
        price,
        status
      FROM memberships
      WHERE user_id = ?
        AND (
          status = 'Active'
          OR (classes_remaining > 0)
        )
      ORDER BY start_date DESC
    `, [userId]);
    
    res.json({ success: true, memberships });
  } catch (error) {
    console.error('Error fetching active memberships:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch memberships' });
  }
});

/**
 * PUT cancel a membership
 */
router.put('/memberships/:id/cancel', authenticateToken, async (req, res) => {
  try {
    const membershipId = req.params.id;
    const userId = req.user.user_id;
    
    // First verify this membership belongs to this user
    const membership = await db.query(`
      SELECT * FROM memberships WHERE membership_id = ? AND user_id = ?
    `, [membershipId, userId]);
    
    if (membership.length === 0) {
      return res.status(404).json({ success: false, message: 'Membership not found or not authorized' });
    }
    
    // Update membership status
    await db.query(`
      UPDATE memberships
      SET status = 'Cancelled', auto_renew = 0, updated_at = ${getDatetimeFunction()}
      WHERE membership_id = ?
    `, [membershipId]);
    
    res.json({ success: true, message: 'Membership cancelled successfully' });
  } catch (error) {
    console.error('Error cancelling membership:', error);
    res.status(500).json({ success: false, message: 'Failed to cancel membership' });
  }
});

/**
 * GET payment history for the current user
 */
router.get('/payments/history', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.user_id;
    
    // Fetch payment history
    const payments = await db.query(`
      SELECT 
        payment_id,
        amount,
        payment_date,
        payment_method,
        payment_type,
        payment_reference,
        notes as description
      FROM payments
      WHERE user_id = ?
      ORDER BY payment_date DESC
      LIMIT 20
    `, [userId]);
    
    res.json({ success: true, payments });
  } catch (error) {
    console.error('Error fetching payment history:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch payment history' });
  }
});

/**
 * PUT update user profile
 */
router.put('/users/profile', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.user_id;
    const { first_name, last_name, email, phone } = req.body;
    
    if (!first_name || !last_name || !email) {
      return res.status(400).json({ success: false, message: 'First name, last name, and email are required' });
    }
    
    // Update user profile
    await db.query(`
      UPDATE users
      SET 
        first_name = ?,
        last_name = ?,
        email = ?,
        phone = ?,
        updated_at = ${getDatetimeFunction()}
      WHERE user_id = ?
    `, [first_name, last_name, email, phone, userId]);
    
    res.json({ 
      success: true, 
      message: 'Profile updated successfully',
      user: {
        user_id: userId,
        first_name,
        last_name,
        email,
        phone
      }
    });
  } catch (error) {
    console.error('Error updating user profile:', error);
    res.status(500).json({ success: false, message: 'Failed to update profile' });
  }
});

/**
 * GET upcoming workshops
 */
router.get('/workshops/upcoming', authenticateToken, async (req, res) => {
  try {
    // Fetch upcoming workshops
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
        member_price,
        location,
        image_url,
        workshop_slug
      FROM workshops
      WHERE date >= date('now')
        AND active = 1
      ORDER BY date, start_time
      LIMIT 10
    `);
    
    res.json({ success: true, workshops });
  } catch (error) {
    console.error('Error fetching upcoming workshops:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch workshops' });
  }
});

/**
 * GET upcoming retreats
 */
router.get('/retreats/upcoming', authenticateToken, async (req, res) => {
  try {
    // Fetch upcoming retreats
    const retreats = await db.query(`
      SELECT 
        retreat_id,
        title,
        description,
        location,
        start_date,
        end_date,
        price,
        capacity,
        image_url,
        venue_name
      FROM retreats
      WHERE start_date >= date('now')
        AND active = 1
      ORDER BY start_date
      LIMIT 10
    `);
    
    res.json({ success: true, retreats });
  } catch (error) {
    console.error('Error fetching upcoming retreats:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch retreats' });
  }
});

/**
 * GET upcoming private sessions
 */
router.get('/private-sessions/upcoming', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.user_id;
    
    // Fetch upcoming private sessions
    const sessions = await db.query(`
      SELECT 
        session_id,
        date,
        start_time,
        duration,
        focus,
        location,
        notes,
        status,
        package_type
      FROM private_sessions
      WHERE user_id = ?
        AND date >= date('now')
        AND status IN ('Confirmed', 'Pending')
      ORDER BY date, start_time
      LIMIT 5
    `, [userId]);
    
    res.json({ success: true, sessions });
  } catch (error) {
    console.error('Error fetching upcoming private sessions:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch private sessions' });
  }
});

/**
 * PUT cancel a private session
 */
router.put('/private-sessions/:id/cancel', authenticateToken, async (req, res) => {
  try {
    const sessionId = req.params.id;
    const userId = req.user.user_id;
    
    // First verify this session belongs to this user
    const session = await db.query(`
      SELECT * FROM private_sessions WHERE session_id = ? AND user_id = ?
    `, [sessionId, userId]);
    
    if (session.length === 0) {
      return res.status(404).json({ success: false, message: 'Session not found or not authorized' });
    }
    
    // Update session status
    await db.query(`
      UPDATE private_sessions
      SET status = 'Cancelled', updated_at = ${getDatetimeFunction()}
      WHERE session_id = ?
    `, [sessionId]);
    
    res.json({ success: true, message: 'Private session cancelled successfully' });
  } catch (error) {
    console.error('Error cancelling private session:', error);
    res.status(500).json({ success: false, message: 'Failed to cancel session' });
  }
});

/**
 * GET website settings - moved from website-settings.js to support dashboard
 */
router.get('/website-settings', async (req, res) => {
  try {
    const settings = await db.query(`
      SELECT settings_json FROM website_settings WHERE id = 1
    `);
    
    if (settings.length === 0) {
      // Return default settings
      return res.json({
        success: true,
        settings: {
          sectionToggles: {
            workshops: true,
            retreats: true,
            privateSessionsSection: true
          }
        }
      });
    }
    
    // Parse the settings JSON and return
    const settingsData = JSON.parse(settings[0].settings_json);
    res.json({
      success: true,
      settings: settingsData
    });
  } catch (error) {
    console.error('Error fetching website settings:', error);
    res.status(500).json({ success: false, message: 'Error fetching website settings' });
  }
});

module.exports = router;

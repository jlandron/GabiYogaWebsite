/**
 * API endpoints for private session requests
 * These endpoints handle private session bookings from users
 */

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('./auth');
const db = require('../database/db-config');
const { getDatetimeFunction } = require('../utils/db-helper');

/**
 * POST create a new private session request
 * This endpoint can be used by both authenticated and non-authenticated users
 */
router.post('/', async (req, res) => {
  try {
    const {
      userId,
      sessionType,
      sessionFocus,
      packageName,
      date1,
      time1,
      date2,
      time2,
      date3,
      time3,
      notes,
      name,
      email
    } = req.body;
    
    // Validate required fields
    if (!date1 || !time1 || !sessionFocus) {
      return res.status(400).json({
        success: false,
        message: 'Date, time, and session focus are required'
      });
    }
    
    const datetimeFunc = getDatetimeFunction();
    
    // If no userId is provided, try to get it from the authenticated user
    let finalUserId = userId;
    if (!finalUserId && req.user) {
      finalUserId = req.user.user_id;
    }
    
    // If still no userId, try to find user by email
    if (!finalUserId && email) {
      const users = await db.query(
        'SELECT user_id FROM users WHERE email = ?',
        [email]
      );
      if (users.length > 0) {
        finalUserId = users[0].user_id;
      } else if (name && email) {
        // Create a basic user account if they don't exist
        const nameParts = name.split(' ');
        const firstName = nameParts[0] || 'Guest';
        const lastName = nameParts.slice(1).join(' ') || 'User';
        
        const result = await db.query(`
          INSERT INTO users (
            first_name,
            last_name,
            email,
            password_hash,
            role,
            created_at,
            updated_at
          ) VALUES (?, ?, ?, ?, 'member', ${datetimeFunc}, ${datetimeFunc})
        `, [
          firstName,
          lastName,
          email,
          'pending_setup', // Placeholder password hash - user will need to set password later
        ]);
        
        finalUserId = result.lastID;
      }
    }
    
    // If we still don't have a userId, we can't create the session
    if (!finalUserId) {
      return res.status(400).json({
        success: false,
        message: 'Unable to create session request. Please provide an email address.'
      });
    }
    
    // Create the first session
    const result1 = await db.query(`
      INSERT INTO private_sessions (
        user_id,
        date,
        start_time,
        duration,
        focus,
        notes,
        status,
        package_type,
        price,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, 'Pending', ?, ?, ${datetimeFunc}, ${datetimeFunc})
    `, [
      finalUserId,
      date1,
      time1,
      60, // Default duration
      sessionFocus,
      notes || '',
      packageName || sessionType || 'Single Session',
      0 // Price will be set when admin confirms the session
    ]);
    
    // Create second session if provided
    if (date2 && time2) {
      await db.query(`
        INSERT INTO private_sessions (
          user_id,
          date,
          start_time,
          duration,
          focus,
          notes,
          status,
          package_type,
          price,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, 'Pending', ?, ?, ${datetimeFunc}, ${datetimeFunc})
      `, [
        finalUserId,
        date2,
        time2,
        60,
        sessionFocus,
        notes || '',
        packageName || sessionType || 'Single Session',
        0 // Price will be set when admin confirms the session
      ]);
    }
    
    // Create third session if provided
    if (date3 && time3) {
      await db.query(`
        INSERT INTO private_sessions (
          user_id,
          date,
          start_time,
          duration,
          focus,
          notes,
          status,
          package_type,
          price,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, 'Pending', ?, ?, ${datetimeFunc}, ${datetimeFunc})
      `, [
        finalUserId,
        date3,
        time3,
        60,
        sessionFocus,
        notes || '',
        packageName || sessionType || 'Single Session',
        0 // Price will be set when admin confirms the session
      ]);
    }
    
    // Send success response
    res.json({
      success: true,
      message: 'Private session request submitted successfully',
      sessionId: result1.lastID
    });
    
  } catch (error) {
    console.error('Error creating private session request:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit private session request',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET get user's private sessions
 * Requires authentication
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.user_id;
    
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
      ORDER BY date DESC, start_time DESC
    `, [userId]);
    
    res.json({
      success: true,
      sessions
    });
    
  } catch (error) {
    console.error('Error fetching private sessions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch private sessions'
    });
  }
});

module.exports = router;

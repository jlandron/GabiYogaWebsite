/**
 * Newsletter API endpoints
 * Handles newsletter subscription and management
 */

const express = require('express');
const { sendSuccess, sendError, asyncHandler } = require('../utils/api-response');
const { NewsletterOperations } = require('../database/data-access');

const router = express.Router();

/**
 * POST /api/newsletter/subscribe
 * Subscribe to newsletter
 */
router.post('/subscribe', asyncHandler(async (req, res) => {
  const { email } = req.body;
  
  // Validate email
  if (!email) {
    return sendError(res, 'Email is required', 400);
  }
  
  // Basic email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return sendError(res, 'Invalid email format', 400);
  }
  
  try {
    const result = await NewsletterOperations.subscribe(email);
    
    if (result.isNew) {
      return sendSuccess(res, { email: result.email }, 'Successfully subscribed to newsletter!');
    } else {
      return sendSuccess(res, { email: result.email }, 'Email already subscribed and reactivated');
    }
  } catch (error) {
    console.error('Error subscribing to newsletter:', error);
    return sendError(res, 'Failed to subscribe to newsletter', 500);
  }
}));

/**
 * POST /api/newsletter/unsubscribe
 * Unsubscribe from newsletter
 */
router.post('/unsubscribe', asyncHandler(async (req, res) => {
  const { email } = req.body;
  
  // Validate email
  if (!email) {
    return sendError(res, 'Email is required', 400);
  }
  
  try {
    await NewsletterOperations.unsubscribe(email);
    return sendSuccess(res, { email }, 'Successfully unsubscribed from newsletter');
  } catch (error) {
    console.error('Error unsubscribing from newsletter:', error);
    return sendError(res, 'Failed to unsubscribe from newsletter', 500);
  }
}));

module.exports = router;

/**
 * Contact API endpoints
 * Handles contact form submissions
 */

const express = require('express');
const { sendSuccess, sendError, asyncHandler } = require('../utils/api-response');
const { ContactOperations } = require('../database/data-access');

const router = express.Router();

/**
 * POST /api/contact/submit
 * Submit contact form
 */
router.post('/submit', asyncHandler(async (req, res) => {
  const { name, email, subject, message } = req.body;
  
  // Validate required fields
  if (!name || !email || !subject || !message) {
    return sendError(res, 'All fields are required', 400);
  }
  
  // Basic email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return sendError(res, 'Invalid email format', 400);
  }
  
  // Validate field lengths
  if (name.length > 255) {
    return sendError(res, 'Name is too long', 400);
  }
  
  if (email.length > 255) {
    return sendError(res, 'Email is too long', 400);
  }
  
  if (subject.length > 500) {
    return sendError(res, 'Subject is too long', 400);
  }
  
  if (message.length > 10000) {
    return sendError(res, 'Message is too long', 400);
  }
  
  try {
    const submission = await ContactOperations.saveContactSubmission({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      subject: subject.trim(),
      message: message.trim()
    });
    
    return sendSuccess(res, { submissionId: submission.submission_id }, 'Message sent successfully! We\'ll get back to you soon.');
  } catch (error) {
    console.error('Error saving contact submission:', error);
    return sendError(res, 'Failed to send message. Please try again later.', 500);
  }
}));

module.exports = router;

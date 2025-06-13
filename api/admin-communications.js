/**
 * Admin Communications API endpoints
 * Handles contact submissions and newsletter subscribers management
 */

const express = require('express');
const { sendSuccess, sendError, asyncHandler } = require('../utils/api-response');
const { ContactOperations, NewsletterOperations } = require('../database/data-access');

const router = express.Router();

/**
 * GET /api/admin/contact-submissions
 * Get contact submissions with pagination and search
 */
router.get('/contact-submissions', asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, search = '' } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  
  try {
    const submissions = await ContactOperations.getContactSubmissions({
      limit: parseInt(limit),
      offset,
      search: search.trim()
    });
    
    const totalCount = await ContactOperations.getContactSubmissionsCount(search.trim());
    
    return sendSuccess(res, {
      submissions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalCount,
        totalPages: Math.ceil(totalCount / parseInt(limit))
      }
    }, 'Contact submissions fetched successfully');
  } catch (error) {
    console.error('Error fetching contact submissions:', error);
    return sendError(res, 'Failed to fetch contact submissions', 500);
  }
}));

/**
 * GET /api/admin/contact-submissions/:id
 * Get individual contact submission details
 */
router.get('/contact-submissions/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  try {
    const submission = await ContactOperations.getContactSubmissionById(parseInt(id));
    
    if (!submission) {
      return sendError(res, 'Contact submission not found', 404);
    }
    
    return sendSuccess(res, { submission }, 'Contact submission fetched successfully');
  } catch (error) {
    console.error('Error fetching contact submission:', error);
    return sendError(res, 'Failed to fetch contact submission', 500);
  }
}));

/**
 * PUT /api/admin/contact-submissions/:id/status
 * Update contact submission status
 */
router.put('/contact-submissions/:id/status', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  
  if (!status || !['New', 'Read', 'Responded', 'Archived'].includes(status)) {
    return sendError(res, 'Invalid status', 400);
  }
  
  try {
    await ContactOperations.updateContactSubmissionStatus(parseInt(id), status);
    return sendSuccess(res, { id, status }, 'Status updated successfully');
  } catch (error) {
    console.error('Error updating contact submission status:', error);
    return sendError(res, 'Failed to update status', 500);
  }
}));

/**
 * GET /api/admin/newsletter-subscribers
 * Get newsletter subscribers with pagination and search
 */
router.get('/newsletter-subscribers', asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, search = '' } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  
  try {
    const subscribers = await NewsletterOperations.getNewsletterSubscribers({
      limit: parseInt(limit),
      offset,
      search: search.trim()
    });
    
    const totalCount = await NewsletterOperations.getNewsletterSubscribersCount(search.trim());
    
    return sendSuccess(res, {
      subscribers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalCount,
        totalPages: Math.ceil(totalCount / parseInt(limit))
      }
    }, 'Newsletter subscribers fetched successfully');
  } catch (error) {
    console.error('Error fetching newsletter subscribers:', error);
    return sendError(res, 'Failed to fetch newsletter subscribers', 500);
  }
}));

/**
 * PUT /api/admin/newsletter-subscribers/:id/status
 * Update newsletter subscriber status (activate/deactivate)
 */
router.put('/newsletter-subscribers/:id/status', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { active } = req.body;
  
  if (typeof active !== 'boolean') {
    return sendError(res, 'Invalid active status', 400);
  }
  
  try {
    await NewsletterOperations.updateSubscriberStatus(parseInt(id), active);
    return sendSuccess(res, { id, active }, 'Subscriber status updated successfully');
  } catch (error) {
    console.error('Error updating subscriber status:', error);
    return sendError(res, 'Failed to update subscriber status', 500);
  }
}));

module.exports = router;

/**
 * Admin API for Gabi Jyoti Yoga Website
 * 
 * This file provides API endpoints for admin operations
 * that interact with the SQLite database.
 */

const express = require('express');
const router = express.Router();
const { 
  ClassOperations, 
  MemberOperations, 
  BookingOperations,
  WorkshopOperations,
  PrivateSessionOperations,
  RetreatOperations
} = require('../database/data-access');

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
 * Get dashboard statistics
 * GET /api/admin/stats
 */
router.get('/stats', requireAdmin, async (req, res) => {
  try {
    const activeMembers = await MemberOperations.countActiveMembers();
    const weeklyBookings = await BookingOperations.countWeeklyBookings();
    const upcomingSessions = await PrivateSessionOperations.countUpcomingSessions();
    const monthlyRevenue = await BookingOperations.calculateMonthlyRevenue();
    
    return res.json({
      success: true,
      activeMembers,
      weeklyBookings,
      upcomingSessions,
      monthlyRevenue
    });
  } catch (error) {
    console.error('Error getting admin stats:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * Get all class templates
 * GET /api/admin/class-templates
 */
router.get('/class-templates', requireAdmin, async (req, res) => {
  try {
    const templates = await ClassOperations.getClassTemplates();
    
    return res.json({
      success: true,
      templates
    });
  } catch (error) {
    console.error('Error fetching class templates:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch class templates',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * Get a specific class template
 * GET /api/admin/class-templates/:id
 */
router.get('/class-templates/:id', requireAdmin, async (req, res) => {
  try {
    const templateId = req.params.id;
    const template = await ClassOperations.getClassTemplateById(templateId);
    
    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Class template not found'
      });
    }
    
    return res.json({
      success: true,
      template
    });
  } catch (error) {
    console.error('Error fetching class template:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch class template',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * Create a new class template
 * POST /api/admin/class-templates
 */
router.post('/class-templates', requireAdmin, async (req, res) => {
  try {
    const template = await ClassOperations.createClassTemplate(req.body);
    
    return res.status(201).json({
      success: true,
      message: 'Class template created successfully',
      template
    });
  } catch (error) {
    console.error('Error creating class template:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create class template',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * Update a class template
 * PUT /api/admin/class-templates/:id
 */
router.put('/class-templates/:id', requireAdmin, async (req, res) => {
  try {
    const templateId = req.params.id;
    const template = await ClassOperations.updateClassTemplate(templateId, req.body);
    
    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Class template not found'
      });
    }
    
    return res.json({
      success: true,
      message: 'Class template updated successfully',
      template
    });
  } catch (error) {
    console.error('Error updating class template:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update class template',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * Delete a class template
 * DELETE /api/admin/class-templates/:id
 */
router.delete('/class-templates/:id', requireAdmin, async (req, res) => {
  try {
    const templateId = req.params.id;
    const deleted = await ClassOperations.deleteClassTemplate(templateId);
    
    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Class template not found'
      });
    }
    
    return res.json({
      success: true,
      message: 'Class template deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting class template:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete class template',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * Get all classes
 * GET /api/admin/classes
 */
router.get('/classes', requireAdmin, async (req, res) => {
  try {
    const classes = await ClassOperations.getClasses();
    
    return res.json({
      success: true,
      classes
    });
  } catch (error) {
    console.error('Error fetching classes:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch classes',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * Create a new class
 * POST /api/admin/classes
 */
router.post('/classes', requireAdmin, async (req, res) => {
  try {
    const classInfo = await ClassOperations.createClass(req.body);
    
    return res.status(201).json({
      success: true,
      message: 'Class created successfully',
      class: classInfo
    });
  } catch (error) {
    console.error('Error creating class:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create class',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * Update a class
 * PUT /api/admin/classes/:id
 */
router.put('/classes/:id', requireAdmin, async (req, res) => {
  try {
    const classId = req.params.id;
    const classInfo = await ClassOperations.updateClass(classId, req.body);
    
    if (!classInfo) {
      return res.status(404).json({
        success: false,
        message: 'Class not found'
      });
    }
    
    return res.json({
      success: true,
      message: 'Class updated successfully',
      class: classInfo
    });
  } catch (error) {
    console.error('Error updating class:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update class',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * Delete a class
 * DELETE /api/admin/classes/:id
 */
router.delete('/classes/:id', requireAdmin, async (req, res) => {
  try {
    const classId = req.params.id;
    const deleted = await ClassOperations.deleteClass(classId);
    
    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Class not found'
      });
    }
    
    return res.json({
      success: true,
      message: 'Class deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting class:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete class',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * Get all members
 * GET /api/admin/members
 */
router.get('/members', requireAdmin, async (req, res) => {
  try {
    const members = await MemberOperations.getAllMembers();
    
    return res.json({
      success: true,
      members
    });
  } catch (error) {
    console.error('Error fetching members:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch members',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * Get a single member by ID
 * GET /api/admin/members/:id
 */
router.get('/members/:id', requireAdmin, async (req, res) => {
  try {
    const memberId = req.params.id;
    const member = await MemberOperations.getMemberById(memberId);
    
    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'Member not found'
      });
    }
    
    return res.json({
      success: true,
      member
    });
  } catch (error) {
    console.error('Error fetching member by ID:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch member details',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * Get recent bookings
 * GET /api/admin/bookings?recent=true
 */
router.get('/bookings', requireAdmin, async (req, res) => {
  try {
    const recent = req.query.recent === 'true';
    let bookings;
    
    if (recent) {
      bookings = await BookingOperations.getRecentBookings();
    } else {
      bookings = await BookingOperations.getAllBookings();
    }
    
    return res.json({
      success: true,
      bookings
    });
  } catch (error) {
    console.error('Error fetching bookings:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch bookings',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * Get all workshops or upcoming workshops
 * GET /api/admin/workshops
 * GET /api/admin/workshops?upcoming=true
 */
router.get('/workshops', requireAdmin, async (req, res) => {
  try {
    const upcoming = req.query.upcoming === 'true';
    let workshops;
    
    if (upcoming) {
      workshops = await WorkshopOperations.getUpcomingWorkshops();
    } else {
      workshops = await WorkshopOperations.getAllWorkshops();
    }
    
    return res.json({
      success: true,
      workshops
    });
  } catch (error) {
    console.error('Error fetching workshops:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch workshops',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * Get a workshop by ID
 * GET /api/admin/workshops/:id
 */
router.get('/workshops/:id', requireAdmin, async (req, res) => {
  try {
    const workshopId = req.params.id;
    const workshop = await WorkshopOperations.getWorkshopById(workshopId);
    
    if (!workshop) {
      return res.status(404).json({
        success: false,
        message: 'Workshop not found'
      });
    }
    
    return res.json({
      success: true,
      workshop
    });
  } catch (error) {
    console.error('Error fetching workshop:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch workshop',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * Create a new workshop
 * POST /api/admin/workshops
 */
router.post('/workshops', requireAdmin, async (req, res) => {
  try {
    const workshop = await WorkshopOperations.createWorkshop(req.body);
    
    return res.status(201).json({
      success: true,
      message: 'Workshop created successfully',
      workshop
    });
  } catch (error) {
    console.error('Error creating workshop:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create workshop',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * Update a workshop
 * PUT /api/admin/workshops/:id
 */
router.put('/workshops/:id', requireAdmin, async (req, res) => {
  try {
    const workshopId = req.params.id;
    const workshop = await WorkshopOperations.updateWorkshop(workshopId, req.body);
    
    if (!workshop) {
      return res.status(404).json({
        success: false,
        message: 'Workshop not found'
      });
    }
    
    return res.json({
      success: true,
      message: 'Workshop updated successfully',
      workshop
    });
  } catch (error) {
    console.error('Error updating workshop:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update workshop',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * Delete a workshop
 * DELETE /api/admin/workshops/:id
 */
router.delete('/workshops/:id', requireAdmin, async (req, res) => {
  try {
    const workshopId = req.params.id;
    const deleted = await WorkshopOperations.deleteWorkshop(workshopId);
    
    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Workshop not found'
      });
    }
    
    return res.json({
      success: true,
      message: 'Workshop deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting workshop:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete workshop',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * Get workshop registrations
 * GET /api/admin/workshops/:id/registrations
 */
router.get('/workshops/:id/registrations', requireAdmin, async (req, res) => {
  try {
    const workshopId = req.params.id;
    const workshop = await WorkshopOperations.getWorkshopById(workshopId);
    
    if (!workshop) {
      return res.status(404).json({
        success: false,
        message: 'Workshop not found'
      });
    }
    
    const registrations = await WorkshopOperations.getWorkshopRegistrations(workshopId);
    
    return res.json({
      success: true,
      registrations
    });
  } catch (error) {
    console.error('Error fetching workshop registrations:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch workshop registrations',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * Update workshop registration attendance
 * PUT /api/admin/workshops/registrations/:id/attendance
 */
router.put('/workshops/registrations/:id/attendance', requireAdmin, async (req, res) => {
  try {
    const registrationId = req.params.id;
    const { attended } = req.body;
    
    if (attended === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Attended status is required'
      });
    }
    
    const registration = await WorkshopOperations.updateRegistrationAttendance(registrationId, attended);
    
    if (!registration) {
      return res.status(404).json({
        success: false,
        message: 'Registration not found'
      });
    }
    
    return res.json({
      success: true,
      message: 'Attendance status updated successfully',
      registration
    });
  } catch (error) {
    console.error('Error updating registration attendance:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update registration attendance',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * Update workshop registration payment status
 * PUT /api/admin/workshops/registrations/:id/payment
 */
router.put('/workshops/registrations/:id/payment', requireAdmin, async (req, res) => {
  try {
    const registrationId = req.params.id;
    const { status } = req.body;
    
    if (!status || !['Paid', 'Pending', 'Refunded'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Valid payment status is required'
      });
    }
    
    const registration = await WorkshopOperations.updateRegistrationPaymentStatus(registrationId, status);
    
    if (!registration) {
      return res.status(404).json({
        success: false,
        message: 'Registration not found'
      });
    }
    
    return res.json({
      success: true,
      message: 'Payment status updated successfully',
      registration
    });
  } catch (error) {
    console.error('Error updating registration payment status:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update registration payment status',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * Get all private sessions
 * GET /api/admin/private-sessions
 */
router.get('/private-sessions', requireAdmin, async (req, res) => {
  try {
    const sessions = await PrivateSessionOperations.getPrivateSessions();
    
    return res.json({
      success: true,
      sessions
    });
  } catch (error) {
    console.error('Error fetching private sessions:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch private sessions',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * Update a private session status
 * PUT /api/admin/private-sessions/:id/status
 */
router.put('/private-sessions/:id/status', requireAdmin, async (req, res) => {
  try {
    const sessionId = req.params.id;
    const { status } = req.body;
    
    if (!status || !['Confirmed', 'Pending', 'Cancelled', 'Completed'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status value'
      });
    }
    
    const session = await PrivateSessionOperations.updateSessionStatus(sessionId, status);
    
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }
    
    return res.json({
      success: true,
      message: 'Session status updated successfully',
      session
    });
  } catch (error) {
    console.error('Error updating session status:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update session status',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * Get all retreats or upcoming retreats
 * GET /api/admin/retreats
 * GET /api/admin/retreats?upcoming=true
 */
router.get('/retreats', requireAdmin, async (req, res) => {
  try {
    const upcoming = req.query.upcoming === 'true';
    let retreats;
    
    if (upcoming) {
      retreats = await RetreatOperations.getUpcomingRetreats();
    } else {
      retreats = await RetreatOperations.getAllRetreats();
    }
    
    return res.json({
      success: true,
      retreats
    });
  } catch (error) {
    console.error('Error fetching retreats:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch retreats',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * Get a retreat by ID
 * GET /api/admin/retreats/:id
 */
router.get('/retreats/:id', requireAdmin, async (req, res) => {
  try {
    const retreatId = req.params.id;
    const retreat = await RetreatOperations.getRetreatById(retreatId);
    
    if (!retreat) {
      return res.status(404).json({
        success: false,
        message: 'Retreat not found'
      });
    }
    
    return res.json({
      success: true,
      retreat
    });
  } catch (error) {
    console.error('Error fetching retreat:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch retreat',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * Create a new retreat
 * POST /api/admin/retreats
 */
router.post('/retreats', requireAdmin, async (req, res) => {
  try {
    const retreat = await RetreatOperations.createRetreat(req.body);
    
    return res.status(201).json({
      success: true,
      message: 'Retreat created successfully',
      retreat
    });
  } catch (error) {
    console.error('Error creating retreat:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create retreat',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * Update a retreat
 * PUT /api/admin/retreats/:id
 */
router.put('/retreats/:id', requireAdmin, async (req, res) => {
  try {
    const retreatId = req.params.id;
    const retreat = await RetreatOperations.updateRetreat(retreatId, req.body);
    
    if (!retreat) {
      return res.status(404).json({
        success: false,
        message: 'Retreat not found'
      });
    }
    
    return res.json({
      success: true,
      message: 'Retreat updated successfully',
      retreat
    });
  } catch (error) {
    console.error('Error updating retreat:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update retreat',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * Delete a retreat
 * DELETE /api/admin/retreats/:id
 */
router.delete('/retreats/:id', requireAdmin, async (req, res) => {
  try {
    const retreatId = req.params.id;
    const deleted = await RetreatOperations.deleteRetreat(retreatId);
    
    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Retreat not found'
      });
    }
    
    return res.json({
      success: true,
      message: 'Retreat deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting retreat:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete retreat',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * Toggle retreat featured status
 * PUT /api/admin/retreats/:id/featured
 */
router.put('/retreats/:id/featured', requireAdmin, async (req, res) => {
  try {
    const retreatId = req.params.id;
    const retreat = await RetreatOperations.toggleRetreatFeatured(retreatId);
    
    if (!retreat) {
      return res.status(404).json({
        success: false,
        message: 'Retreat not found'
      });
    }
    
    const featuredStatus = retreat.featured ? 'featured' : 'unfeatured';
    
    return res.json({
      success: true,
      message: `Retreat ${featuredStatus} successfully`,
      retreat
    });
  } catch (error) {
    console.error('Error toggling retreat featured status:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to toggle retreat featured status',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * Get retreat registrations
 * GET /api/admin/retreats/:id/registrations
 */
router.get('/retreats/:id/registrations', requireAdmin, async (req, res) => {
  try {
    const retreatId = req.params.id;
    const retreat = await RetreatOperations.getRetreatById(retreatId);
    
    if (!retreat) {
      return res.status(404).json({
        success: false,
        message: 'Retreat not found'
      });
    }
    
    const registrations = await RetreatOperations.getRetreatRegistrations(retreatId);
    
    return res.json({
      success: true,
      registrations
    });
  } catch (error) {
    console.error('Error fetching retreat registrations:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch retreat registrations',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * Update retreat registration payment status
 * PUT /api/admin/retreats/registrations/:id/payment
 */
router.put('/retreats/registrations/:id/payment', requireAdmin, async (req, res) => {
  try {
    const registrationId = req.params.id;
    const { status, amountPaid, balanceDue } = req.body;
    
    if (!status || !['Deposit Paid', 'Full Payment', 'Partial Payment', 'Pending', 'Refunded', 'Cancelled'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Valid payment status is required'
      });
    }
    
    if (amountPaid === undefined || balanceDue === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Amount paid and balance due are required'
      });
    }
    
    const registration = await RetreatOperations.updateRegistrationPaymentStatus(
      registrationId, 
      status,
      amountPaid,
      balanceDue
    );
    
    if (!registration) {
      return res.status(404).json({
        success: false,
        message: 'Registration not found'
      });
    }
    
    return res.json({
      success: true,
      message: 'Payment status updated successfully',
      registration
    });
  } catch (error) {
    console.error('Error updating registration payment status:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update registration payment status',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;

/**
 * Class Bookings API endpoints
 * Handles class reservations and bookings
 */

const express = require('express');
const router = express.Router();
const { BookingOperations, ClassOperations, AuthOperations } = require('../database/data-access');
const jwt = require('jsonwebtoken');

// Middleware to authenticate user
const authenticateUser = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    const user = await AuthOperations.findUserById(decoded.userId);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid authentication token'
    });
  }
};

/**
 * Create a class booking
 * POST /api/class-bookings
 */
router.post('/', authenticateUser, async (req, res) => {
  try {
    const {
      classId,
      className,
      classIdentifier,
      paymentMethod,
      date
    } = req.body;

    // Basic validation
    if (!classId || !paymentMethod || !date) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: classId, paymentMethod, and date are required'
      });
    }

    // Get class details to check availability
    const classDetails = await ClassOperations.getClassById(classId);
    if (!classDetails) {
      return res.status(404).json({
        success: false,
        message: 'Class not found'
      });
    }

    // Check class capacity
    const existingBookings = await ClassOperations.getBookingsForClassAndDate(classId, date);
    const capacity = classDetails.capacity || 20;
    
    if (existingBookings.length >= capacity) {
      return res.status(400).json({
        success: false,
        message: 'Class is full. No available spaces.'
      });
    }

    // Create the booking
    const bookingData = {
      user_id: req.user.user_id,
      class_id: classId,
      date: date,
      payment_method: paymentMethod,
      status: 'Confirmed'
    };

    const booking = await BookingOperations.createClassBooking(bookingData);

    if (!booking) {
      return res.status(500).json({
        success: false,
        message: 'Failed to create booking'
      });
    }

    console.log('Class booking created successfully:', {
      bookingId: booking.booking_id,
      userId: req.user.user_id,
      className: classDetails.name,
      date: date,
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      message: 'Class booking confirmed successfully!',
      booking: {
        id: booking.booking_id,
        className: booking.class_name,
        date: booking.date,
        status: booking.status,
        createdAt: booking.created_at
      }
    });

  } catch (error) {
    console.error('Error creating class booking:', error);
    
    // Handle specific error cases
    if (error.message.includes('already has a booking')) {
      return res.status(400).json({
        success: false,
        message: 'You are already booked for this class on this date'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to create class booking',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * Get user's class bookings
 * GET /api/class-bookings/user/:userId
 */
router.get('/user/:userId', authenticateUser, async (req, res) => {
  try {
    const { userId } = req.params;

    // Verify user can only access their own bookings (or admin can access all)
    if (req.user.user_id != userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only view your own bookings.'
      });
    }

    const bookings = await BookingOperations.getUserBookings(userId);

    res.json({
      success: true,
      bookings
    });

  } catch (error) {
    console.error('Error fetching user bookings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch bookings',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * Cancel a class booking
 * DELETE /api/class-bookings/:bookingId
 */
router.delete('/:bookingId', authenticateUser, async (req, res) => {
  try {
    const { bookingId } = req.params;

    // Cancel the booking (only allow user to cancel their own booking unless admin)
    const userId = req.user.role === 'admin' ? null : req.user.user_id;
    const success = await BookingOperations.cancelBooking(bookingId, userId);

    if (!success) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found or you do not have permission to cancel it'
      });
    }

    console.log(`Class booking ${bookingId} cancelled by user ${req.user.user_id}`);

    res.json({
      success: true,
      message: 'Booking cancelled successfully'
    });

  } catch (error) {
    console.error('Error cancelling booking:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel booking',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;

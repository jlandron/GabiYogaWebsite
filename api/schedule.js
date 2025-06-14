/**
 * Schedule API endpoints for public schedule display
 */

const express = require('express');
const router = express.Router();
const { ClassOperations } = require('../database/data-access');

/**
 * Get public schedule for homepage
 * GET /api/schedule
 */
router.get('/', async (req, res) => {
  try {
    // Get all active classes
    const classes = await ClassOperations.getClasses();
    
    // Filter only active classes
    const activeClasses = classes.filter(cls => cls.active);
    
    // Get booking counts for each class (for the current week)
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay()); // Go to Sunday
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6); // Go to Saturday
    
    // Transform the data for the frontend schedule display
    const schedule = await Promise.all(activeClasses.map(async (cls) => {
      // Convert day_of_week number to day name
      const dayNames = {
        0: 'Sunday',
        1: 'Monday', 
        2: 'Tuesday',
        3: 'Wednesday',
        4: 'Thursday',
        5: 'Friday',
        6: 'Saturday'
      };
      
      // Format time for display (convert 24-hour to 12-hour format)
      const formatTime = (timeStr) => {
        const [hours, minutes] = timeStr.split(':');
        const hour = parseInt(hours, 10);
        const period = hour >= 12 ? 'PM' : 'AM';
        const hour12 = hour % 12 === 0 ? 12 : hour % 12;
        return `${hour12}:${minutes} ${period}`;
      };
      
      // Calculate the next occurrence of this class
      const classDay = cls.day_of_week;
      const nextClassDate = new Date(startOfWeek);
      nextClassDate.setDate(startOfWeek.getDate() + classDay);
      
      // Get booking count for this specific class on this date
      let bookedCount = 0;
      try {
        const bookings = await ClassOperations.getBookingsForClassAndDate(cls.class_id, nextClassDate.toISOString().split('T')[0]);
        bookedCount = bookings ? bookings.length : 0;
      } catch (error) {
        console.warn(`Error getting bookings for class ${cls.class_id}:`, error.message);
        bookedCount = 0;
      }
      
      // Calculate available spaces
      const capacity = cls.capacity || 20;
      const availableSpaces = Math.max(0, capacity - bookedCount);
      
      return {
        id: cls.class_id,
        name: cls.name,
        day: dayNames[cls.day_of_week],
        time: formatTime(cls.start_time),
        instructor: cls.instructor,
        level: cls.level,
        duration: cls.duration || 60, // Default to 60 minutes if not specified
        type: cls.level, // Use level as type for styling
        capacity: capacity,
        booked: bookedCount,
        availableSpaces: availableSpaces
      };
    }));
    
    res.json({
      success: true,
      schedule
    });
    
  } catch (error) {
    console.error('Error fetching schedule:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch schedule',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * Get bookings for a specific class and date (Admin endpoint)
 * GET /api/schedule/class/:classId/bookings?date=YYYY-MM-DD
 */
router.get('/class/:classId/bookings', async (req, res) => {
  try {
    const { classId } = req.params;
    const { date } = req.query;
    
    if (!date) {
      return res.status(400).json({
        success: false,
        message: 'Date parameter is required'
      });
    }
    
    // Get bookings for this class on this date
    const bookings = await ClassOperations.getBookingsForClassAndDate(classId, date);
    
    // Get detailed user information for each booking
    const detailedBookings = await Promise.all(bookings.map(async (booking) => {
      try {
        const user = await ClassOperations.getUserById(booking.user_id);
        return {
          booking_id: booking.booking_id,
          user_id: booking.user_id,
          user_name: user ? `${user.first_name} ${user.last_name}` : 'Unknown User',
          user_email: user ? user.email : '',
          user_phone: user ? user.phone : '',
          status: booking.status,
          booking_date: booking.booking_date,
          created_at: booking.created_at
        };
      } catch (error) {
        console.warn(`Error getting user details for booking ${booking.booking_id}:`, error.message);
        return {
          booking_id: booking.booking_id,
          user_id: booking.user_id,
          user_name: 'Unknown User',
          user_email: '',
          user_phone: '',
          status: booking.status,
          booking_date: booking.booking_date,
          created_at: booking.created_at
        };
      }
    }));
    
    res.json({
      success: true,
      bookings: detailedBookings
    });
    
  } catch (error) {
    console.error('Error fetching class bookings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch class bookings',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;

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
    
    // Transform the data for the frontend schedule display
    const schedule = activeClasses.map(cls => {
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
      
      return {
        name: cls.name,
        day: dayNames[cls.day_of_week],
        time: formatTime(cls.start_time),
        instructor: cls.instructor,
        level: cls.level,
        duration: cls.duration,
        type: cls.level // Use level as type for styling
      };
    });
    
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

module.exports = router;

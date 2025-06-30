/**
 * Booking Classes Lambda Function
 * Handles retrieving available yoga classes with schedules and availability
 */

const { 
  createSuccessResponse, 
  createErrorResponse,
  logWithContext,
  dynamoUtils
} = require('../shared/public-utils');

exports.handler = async (event, context) => {
  const requestId = context.awsRequestId;
  
  try {
    logWithContext('info', 'Booking classes request received', { requestId });

    // Handle CORS preflight
    if (event.httpMethod === 'OPTIONS') {
      return createSuccessResponse({}, 200);
    }

    // Parse query parameters
    const queryParams = event.queryStringParameters || {};
    const limit = Math.min(parseInt(queryParams.limit) || 20, 50);
    const page = Math.max(parseInt(queryParams.page) || 1, 1);
    const category = queryParams.category; // e.g., 'beginner', 'intermediate', 'advanced'
    const date = queryParams.date; // YYYY-MM-DD format
    const upcoming = queryParams.upcoming !== 'false'; // Default to upcoming classes only

    logWithContext('info', 'Processing booking classes request', { 
      requestId, 
      limit,
      page,
      category,
      date,
      upcoming
    });

    try {
      const AWS = require('aws-sdk');
      const dynamoDb = new AWS.DynamoDB.DocumentClient();
      
      // Build filter expression
      let filterExpression = '#status = :active';
      let expressionAttributeNames = { '#status': 'status' };
      let expressionAttributeValues = { ':active': 'active' };

      if (category) {
        filterExpression += ' AND category = :category';
        expressionAttributeValues[':category'] = category;
      }

      if (date) {
        filterExpression += ' AND begins_with(scheduleDate, :date)';
        expressionAttributeValues[':date'] = date;
      } else if (upcoming) {
        // Only show classes from today onwards
        const today = new Date().toISOString().split('T')[0];
        filterExpression += ' AND scheduleDate >= :today';
        expressionAttributeValues[':today'] = today;
      }

      const scanParams = {
        TableName: process.env.CLASSES_TABLE,
        FilterExpression: filterExpression,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
        Limit: limit
      };

      const result = await dynamoDb.scan(scanParams).promise();
      const classes = result.Items || [];

      // Sort classes by date and time
      classes.sort((a, b) => {
        const dateTimeA = new Date(`${a.scheduleDate}T${a.startTime}`);
        const dateTimeB = new Date(`${b.scheduleDate}T${b.startTime}`);
        return dateTimeA - dateTimeB;
      });

      // Apply pagination after sorting
      const startIndex = (page - 1) * limit;
      const paginatedClasses = classes.slice(startIndex, startIndex + limit);

      // Transform classes for response and calculate availability
      const transformedClasses = await Promise.all(
        paginatedClasses.map(async (classItem) => {
          // Get current bookings for this class
          const bookings = await getClassBookings(classItem.id);
          const availableSpots = Math.max((classItem.maxParticipants || 20) - bookings.length, 0);
          
          return {
            id: classItem.id,
            title: classItem.title,
            description: classItem.description,
            instructor: classItem.instructor || 'Gabi',
            category: classItem.category || 'general',
            level: classItem.level || 'All Levels',
            duration: classItem.duration || 60, // minutes
            price: classItem.price || 25, // dollars
            scheduleDate: classItem.scheduleDate,
            startTime: classItem.startTime,
            endTime: classItem.endTime,
            location: classItem.location || 'Main Studio',
            maxParticipants: classItem.maxParticipants || 20,
            currentBookings: bookings.length,
            availableSpots,
            isFullyBooked: availableSpots === 0,
            requirements: classItem.requirements || [],
            whatToBring: classItem.whatToBring || [],
            cancellationPolicy: classItem.cancellationPolicy || 'Cancel up to 2 hours before class',
            createdAt: classItem.createdAt,
            updatedAt: classItem.updatedAt
          };
        })
      );

      // Calculate pagination info
      const totalClasses = classes.length;
      const totalPages = Math.ceil(totalClasses / limit);
      const hasNextPage = page < totalPages;
      const hasPrevPage = page > 1;

      logWithContext('info', 'Booking classes request successful', { 
        requestId, 
        classesReturned: transformedClasses.length,
        totalClasses,
        page
      });

      return createSuccessResponse({
        classes: transformedClasses,
        pagination: {
          currentPage: page,
          totalPages,
          totalClasses,
          classesPerPage: limit,
          hasNextPage,
          hasPrevPage,
          nextPage: hasNextPage ? page + 1 : null,
          prevPage: hasPrevPage ? page - 1 : null
        },
        filters: {
          category,
          date,
          upcoming
        },
        categories: getClassCategories(),
        levels: getClassLevels()
      });

    } catch (dbError) {
      logWithContext('error', 'Database error in booking classes', { 
        requestId, 
        error: dbError.message 
      });
      throw dbError;
    }

  } catch (error) {
    logWithContext('error', 'Booking classes error', { 
      requestId, 
      error: error.message,
      stack: error.stack 
    });

    if (error.code === 'ResourceNotFoundException') {
      return createErrorResponse('Booking service temporarily unavailable', 503);
    }

    return createErrorResponse('An error occurred while fetching classes', 500);
  }
};

/**
 * Get current bookings for a specific class
 */
async function getClassBookings(classId) {
  try {
    const bookings = await dynamoUtils.queryItems(
      process.env.BOOKINGS_TABLE,
      'ClassIndex',
      'classId = :classId AND #status = :status',
      {
        ':classId': classId,
        ':status': 'confirmed'
      },
      {
        '#status': 'status'
      }
    );
    return bookings || [];
  } catch (error) {
    console.error('Error getting class bookings:', error);
    return [];
  }
}

/**
 * Get available class categories
 */
function getClassCategories() {
  return [
    { id: 'hatha', name: 'Hatha Yoga', description: 'Gentle, slow-paced yoga focusing on basic postures' },
    { id: 'vinyasa', name: 'Vinyasa Flow', description: 'Dynamic sequences linking breath and movement' },
    { id: 'yin', name: 'Yin Yoga', description: 'Passive poses held for longer periods, targeting deep tissues' },
    { id: 'restorative', name: 'Restorative', description: 'Deeply relaxing practice using props for support' },
    { id: 'meditation', name: 'Meditation', description: 'Guided meditation and mindfulness practices' },
    { id: 'pranayama', name: 'Pranayama', description: 'Breathing techniques and breath awareness' },
    { id: 'general', name: 'General', description: 'Mixed style yoga suitable for all levels' }
  ];
}

/**
 * Get available class levels
 */
function getClassLevels() {
  return [
    { id: 'beginner', name: 'Beginner', description: 'Perfect for those new to yoga' },
    { id: 'intermediate', name: 'Intermediate', description: 'For practitioners with some experience' },
    { id: 'advanced', name: 'Advanced', description: 'Challenging practice for experienced yogis' },
    { id: 'all-levels', name: 'All Levels', description: 'Suitable for practitioners of any level' }
  ];
}

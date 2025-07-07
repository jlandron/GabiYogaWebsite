/**
 * List User Bookings Lambda Function
 * Handles retrieving a user's booked classes and filtering by status/date
 */

const { 
  createSuccessResponse, 
  createErrorResponse,
  logWithContext,
  getUserFromToken
} = require('../shared/public-utils');
const AWS = require('aws-sdk');
const dynamoDb = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event, context) => {
  const requestId = context.awsRequestId;
  
  try {
    logWithContext('info', 'List bookings request received', { requestId });

    // Handle CORS preflight
    if (event.httpMethod === 'OPTIONS') {
      return createSuccessResponse({}, 200);
    }

    // Get user from token
    const user = await getUserFromToken(event);
    if (!user) {
        return createErrorResponse('Unauthorized', 401);
    }
    const userId = user.id;

    if (!userId) {
      logWithContext('error', 'Unauthorized bookings list request', { requestId });
      return createErrorResponse('Unauthorized. Please log in to view your bookings.', 401);
    }

    // Parse pagination parameters - only used for large datasets
    const queryParams = event.queryStringParameters || {};
    const limit = Math.min(parseInt(queryParams.limit) || 100, 200); // Increased limit
    const page = Math.max(parseInt(queryParams.page) || 1, 1);

    logWithContext('info', 'Processing list bookings request', { 
      requestId, userId, limit, page
    });

    // Log the table name for debugging
    logWithContext('debug', 'Table and index information', {
      requestId,
      tableName: process.env.BOOKINGS_TABLE,
      indexName: 'UserBookingsIndex'
    });

    // Use the GSI to query bookings efficiently by userId
    const queryParams1 = {
      TableName: process.env.BOOKINGS_TABLE,
      IndexName: 'UserBookingsIndex',
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: { ':userId': userId }
    };
    
    logWithContext('debug', 'Querying bookings with GSI', { 
      requestId,
      userId
    });
    
    const result = await dynamoDb.query(queryParams1).promise();
    const bookings = result.Items || [];
    
    logWithContext('debug', 'Query result using GSI', { 
      requestId, 
      bookingsCount: bookings.length,
      userId,
      firstItem: bookings.length > 0 ? {
        id: bookings[0].id,
        userId: bookings[0].userId,
        date: bookings[0].date,
        createdAt: bookings[0].createdAt || bookings[0].bookingDate // Handle both field names during transition
      } : null
    });
    
    // If we found no bookings, return an empty list (don't do expensive scans)
    if (bookings.length === 0) {
      logWithContext('info', 'No bookings found for user', { requestId, userId });
      return createSuccessResponse({
        bookings: [],
        pagination: {
          currentPage: 1,
          totalPages: 0,
          totalBookings: 0,
          bookingsPerPage: limit,
          hasNextPage: false,
          hasPrevPage: false
        },
        filterOptions: {
          months: [],
          categories: []
        }
      });
    }
    
    // Validate bookings have required fields
    const validBookings = bookings.filter(booking => booking && booking.date && booking.time);
    
    if (validBookings.length !== bookings.length) {
      logWithContext('warn', 'Some bookings were missing required fields', {
        requestId,
        totalBookings: bookings.length,
        validBookings: validBookings.length
      });
    }

    // Sort all bookings by date and time, soonest first by default
    validBookings.sort((a, b) => {
      return new Date(`${a.date}T${a.time}`) - new Date(`${b.date}T${b.time}`);
    });

    // Apply pagination
    const startIndex = (page - 1) * limit;
    const endIndex = Math.min(startIndex + limit, validBookings.length);
    const paginatedBookings = validBookings.slice(startIndex, endIndex);

    // Enhance all bookings with additional class information in one batch operation
    const enhancedBookings = await batchEnhanceBookings(paginatedBookings, dynamoDb, requestId);
    
    // Add a flag for status display (upcoming vs. past)
    const now = new Date();
    enhancedBookings.forEach(booking => {
      booking.isPast = new Date(`${booking.date}T${booking.time}`) < now;
      
      // Normalize createdAt/bookingDate field for consistency in frontend
      if (!booking.createdAt && booking.bookingDate) {
        booking.createdAt = booking.bookingDate;
      }
    });

    // Calculate pagination info
    const totalBookings = validBookings.length;
    const totalPages = Math.ceil(totalBookings / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    // Safely extract months and categories
    const months = [];
    const categories = [];
    
    validBookings.forEach(booking => {
      // Add month if valid date exists
      if (booking.date && typeof booking.date === 'string' && booking.date.length >= 7) {
        const month = booking.date.substring(0, 7); // YYYY-MM
        if (!months.includes(month)) {
          months.push(month);
        }
      }
      
      // Add category if exists
      if (booking.category && typeof booking.category === 'string') {
        if (!categories.includes(booking.category)) {
          categories.push(booking.category);
        }
      }
    });
    
    // Sort months chronologically
    months.sort();

    logWithContext('info', 'Bookings list request successful', { 
      requestId, 
      bookingsReturned: enhancedBookings.length,
      totalBookings,
      page
    });

    return createSuccessResponse({
      bookings: enhancedBookings,
      pagination: {
        currentPage: page,
        totalPages,
        totalBookings,
        bookingsPerPage: limit,
        hasNextPage,
        hasPrevPage,
        nextPage: hasNextPage ? page + 1 : null,
        prevPage: hasPrevPage ? page - 1 : null
      },
      // Include metadata for client-side filtering
      filterOptions: {
        months: months,
        categories: categories
      }
    });

  } catch (error) {
    logWithContext('error', 'Error listing bookings', { 
      requestId, 
      error: error.message,
      stack: error.stack 
    });

    return createErrorResponse('An error occurred while retrieving your bookings', 500);
  }
};

/**
 * Enhance multiple bookings with class details in a batch operation
 * More efficient than fetching each class individually
 */
async function batchEnhanceBookings(bookings, dynamoDb, requestId) {
  try {
    // Most bookings already contain all needed information based on the DynamoDB entry
    // Bookings already have: className, instructor, location, level, etc.
    // But if any are missing, we'll fetch them from the class table
    
    // Identify which bookings need class details and have valid classId
    const bookingsNeedingDetails = bookings.filter(
      booking => booking.classId && typeof booking.classId === 'string' && 
      (!booking.instructor || !booking.location || !booking.category || !booking.level || !booking.duration)
    );
    
    logWithContext('debug', 'Bookings needing class details enhancement', { 
      requestId, 
      count: bookingsNeedingDetails.length,
      totalBookings: bookings.length
    });
    
    // If no bookings need details, return original bookings
    if (bookingsNeedingDetails.length === 0) {
      return bookings;
    }
    
    // Get unique class IDs to fetch
    const uniqueClassIds = [...new Set(bookingsNeedingDetails.map(b => b.classId))];
    
    if (!uniqueClassIds.length) {
      return bookings;
    }

    // Make sure CLASSES_TABLE environment variable exists
    if (!process.env.CLASSES_TABLE) {
      logWithContext('error', 'Missing CLASSES_TABLE environment variable', { requestId });
      return bookings;
    }
    
    // Batch get items (DynamoDB allows up to 100 items per batch)
    const batchGetParams = {
      RequestItems: {
        [process.env.CLASSES_TABLE]: {
          Keys: uniqueClassIds.map(id => ({ id }))
        }
      }
    };
    
    const batchResult = await dynamoDb.batchGet(batchGetParams).promise();
    
    // Create map of class details for quick lookup
    const classDetailsMap = new Map();
    const classItems = batchResult.Responses?.[process.env.CLASSES_TABLE] || [];
    
    classItems.forEach(classItem => {
      if (classItem && classItem.id) {
        classDetailsMap.set(classItem.id, classItem);
      }
    });
    
    // Enhance each booking with its class details
    return bookings.map(booking => {
      // Skip if no classId or already has all details
      if (!booking.classId) return booking;
      
      const classDetails = classDetailsMap.get(booking.classId);
      if (!classDetails) return booking;
      
      // Ensure we have a className for display
      const className = booking.className || classDetails.title || 'Yoga Class';
      
      // Merge class details into booking, prioritizing what's already in the booking
      return {
        ...booking,
        className: className,
        instructor: booking.instructor || classDetails.instructor || 'Instructor',
        location: booking.location || classDetails.location || 'Studio',
        category: booking.category || classDetails.category || 'general',
        level: booking.level || classDetails.level || 'All Levels',
        duration: booking.duration || classDetails.duration || 60
      };
    });
  } catch (error) {
    logWithContext('warn', 'Error batch enhancing bookings', { 
      requestId, 
      error: error.message,
      stack: error.stack
    });
    // Return original bookings if enhancement fails
    return bookings;
  }
}

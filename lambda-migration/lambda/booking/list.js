/**
 * List User Bookings Lambda Function
 * Handles retrieving a user's booked classes and filtering by status/date
 */

const { 
  createSuccessResponse, 
  createErrorResponse,
  logWithContext,
  dynamoUtils
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

    // Check if user is authenticated
    const userId = event.requestContext?.authorizer?.claims?.sub;
    if (!userId) {
      logWithContext('error', 'Unauthorized bookings list request', { requestId });
      return createErrorResponse('Unauthorized. Please log in to view your bookings.', 401);
    }

    // Parse query parameters
    const queryParams = event.queryStringParameters || {};
    const limit = Math.min(parseInt(queryParams.limit) || 20, 50);
    const page = Math.max(parseInt(queryParams.page) || 1, 1);
    const type = queryParams.type || 'all'; // 'upcoming', 'past', 'all'
    const month = queryParams.month; // YYYY-MM format
    const classType = queryParams.classType; // class category filter

    logWithContext('info', 'Processing list bookings request', { 
      requestId, userId, type, month, classType, limit, page
    });

    // Build filter expression
    let filterExpression = 'userId = :userId';
    let expressionAttributeValues = { ':userId': userId };

    // Add status filter if needed
    if (queryParams.status) {
      filterExpression += ' AND #status = :status';
      expressionAttributeValues[':status'] = queryParams.status;
    }

    // Add class type filter
    if (classType) {
      filterExpression += ' AND category = :category';
      expressionAttributeValues[':category'] = classType;
    }

    // Add month filter
    if (month) {
      filterExpression += ' AND begins_with(date, :month)';
      expressionAttributeValues[':month'] = month;
    }

    // Current date for past/upcoming filtering
    const today = new Date().toISOString().split('T')[0];

    // Filter by past or upcoming
    if (type === 'upcoming') {
      filterExpression += ' AND date >= :today';
      expressionAttributeValues[':today'] = today;
    } else if (type === 'past') {
      filterExpression += ' AND date < :today';
      expressionAttributeValues[':today'] = today;
    }

    // Prepare the scan params
    const queryParams1 = {
      TableName: process.env.BOOKINGS_TABLE,
      IndexName: 'UserIndex', // Assuming we have a GSI for userId
      KeyConditionExpression: 'userId = :userId',
      FilterExpression: filterExpression.includes(' AND ') ? 
        filterExpression.split('userId = :userId AND ')[1] : undefined,
      ExpressionAttributeValues: expressionAttributeValues,
      Limit: limit
    };

    // If there's a status filter, add ExpressionAttributeNames
    if (queryParams.status) {
      queryParams1.ExpressionAttributeNames = { '#status': 'status' };
    }

    // Execute the query
    const result = await dynamoDb.query(queryParams1).promise();
    let bookings = result.Items || [];

    // Sort bookings by date and time
    bookings.sort((a, b) => {
      if (type === 'past') {
        // For past bookings, sort by most recent first
        return new Date(`${b.date}T${b.time}`) - new Date(`${a.date}T${a.time}`);
      } else {
        // For upcoming bookings, sort by soonest first
        return new Date(`${a.date}T${a.time}`) - new Date(`${b.date}T${b.time}`);
      }
    });

    // Apply pagination
    const startIndex = (page - 1) * limit;
    const endIndex = Math.min(startIndex + limit, bookings.length);
    const paginatedBookings = bookings.slice(startIndex, endIndex);

    // Enhance booking details with additional class information if needed
    const enhancedBookings = await Promise.all(
      paginatedBookings.map(async (booking) => {
        // If the booking doesn't have all class details, fetch them
        if (booking.classId && (!booking.instructor || !booking.location)) {
          try {
            const classResult = await dynamoDb.get({
              TableName: process.env.CLASSES_TABLE,
              Key: { id: booking.classId }
            }).promise();

            const classItem = classResult.Item;
            if (classItem) {
              booking.instructor = classItem.instructor || booking.instructor;
              booking.location = classItem.location || booking.location;
              booking.category = classItem.category || booking.category;
              booking.level = classItem.level || booking.level;
              booking.duration = classItem.duration || booking.duration;
            }
          } catch (err) {
            logWithContext('warn', 'Error fetching class details', { 
              requestId, 
              bookingId: booking.id, 
              classId: booking.classId,
              error: err.message 
            });
            // Continue even if class details can't be fetched
          }
        }
        
        // Add a flag for status display
        booking.isPast = new Date(`${booking.date}T${booking.time}`) < new Date();
        
        return booking;
      })
    );

    // Calculate pagination info
    const totalBookings = bookings.length;
    const totalPages = Math.ceil(totalBookings / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

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
      filters: {
        type,
        month,
        classType
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

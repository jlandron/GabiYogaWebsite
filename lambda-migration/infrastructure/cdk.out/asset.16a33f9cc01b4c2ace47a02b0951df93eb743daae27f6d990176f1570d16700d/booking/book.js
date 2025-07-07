/**
 * Book Class Lambda Function
 * Handles booking a yoga class for a user
 */

const { 
  createSuccessResponse, 
  createErrorResponse,
  logWithContext,
  dynamoUtils,
  getUserFromToken
} = require('../shared/public-utils');
const { v4: uuidv4 } = require('uuid');
const AWS = require('aws-sdk');
const dynamoDb = new AWS.DynamoDB.DocumentClient();
const emailService = require('../shared/email-service');

exports.handler = async (event, context) => {
  const requestId = context.awsRequestId;
  
  try {
    logWithContext('info', 'Book class request received', { requestId });

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
      logWithContext('error', 'Unauthorized booking request', { requestId });
      return createErrorResponse('Unauthorized. Please log in to book a class.', 401);
    }

    // Parse parameters
    const classId = event.pathParameters?.id;
    if (!classId) {
      return createErrorResponse('Missing class ID', 400);
    }

    // Get class details
    const classResult = await dynamoDb.get({
      TableName: process.env.CLASSES_TABLE,
      Key: { id: classId }
    }).promise();

    const classItem = classResult.Item;
    if (!classItem) {
      logWithContext('error', 'Class not found', { requestId, classId });
      return createErrorResponse('Class not found', 404);
    }

    // Check if the class is in the future
    const classDate = new Date(`${classItem.scheduleDate}T${classItem.startTime}`);
    const now = new Date();
    if (classDate < now) {
      logWithContext('error', 'Cannot book a class in the past', { requestId, classId, classDate });
      return createErrorResponse('Cannot book a class that has already started', 400);
    }

    // Check for existing booking by this user - use direct DB query
    const userBookingsParams = {
      TableName: process.env.BOOKINGS_TABLE,
      IndexName: 'UserBookingsIndex',
      KeyConditionExpression: 'userId = :userId',
      FilterExpression: 'classId = :classId',
      ExpressionAttributeValues: {
        ':userId': userId,
        ':classId': classId
      }
    };
    
    const existingBookingsResult = await dynamoDb.query(userBookingsParams).promise();
    const existingBookings = existingBookingsResult.Items || [];

    // Check if user has any active (confirmed or waitlisted) bookings for this class
    const activeBooking = existingBookings.find(b => 
      b.status === 'confirmed' || b.status === 'waitlisted'
    );
    
    // If user has an active booking, return error
    if (activeBooking) {
      logWithContext('error', 'User already has an active booking for this class', { 
        requestId, userId, classId 
      });
      return createErrorResponse('You already have a booking for this class', 409);
    }
    
    // Check if user has a canceled booking that can be reinstated
    const canceledBooking = existingBookings.find(b => b.status === 'canceled');

    // Check class availability - use direct DB query to avoid KeyConditionExpression issues
    const classBookingsParams = {
      TableName: process.env.BOOKINGS_TABLE,
      IndexName: 'ClassBookingsIndex',
      KeyConditionExpression: 'classId = :classId',
      FilterExpression: '#status = :status',
      ExpressionAttributeValues: {
        ':classId': classId,
        ':status': 'confirmed'
      },
      ExpressionAttributeNames: {
        '#status': 'status'
      }
    };
    
    const bookingsResult = await dynamoDb.query(classBookingsParams).promise();
    const bookings = bookingsResult.Items || [];

    const currentBookings = bookings ? bookings.length : 0;
    const maxParticipants = classItem.maxParticipants || 20;
    const availableSpots = Math.max(maxParticipants - currentBookings, 0);

    if (availableSpots === 0) {
      // Add to waitlist instead of booking directly
      const waitlistBooking = {
        id: uuidv4(),
        classId,
        userId,
        status: 'waitlisted',
        className: classItem.title,
        date: classItem.scheduleDate,
        time: classItem.startTime,
        instructor: classItem.instructor || 'Gabi',
        createdAt: new Date().toISOString(),
        waitlistPosition: currentBookings - maxParticipants + 1
      };

      await dynamoDb.put({
        TableName: process.env.BOOKINGS_TABLE,
        Item: waitlistBooking
      }).promise();

      logWithContext('info', 'User added to waitlist for class', { 
        requestId, userId, classId, waitlistPosition: waitlistBooking.waitlistPosition 
      });

      return createSuccessResponse({
        message: 'You have been added to the waitlist for this class',
        booking: waitlistBooking
      });
    }

    // If user had a canceled booking, update it instead of creating a new one
    const booking = canceledBooking ? {
      ...canceledBooking,
      status: 'confirmed',
      updatedAt: new Date().toISOString()
    } : {
      id: uuidv4(),
      classId,
      userId,
      status: 'confirmed',
      className: classItem.title,
      date: classItem.scheduleDate,
      time: classItem.startTime,
      instructor: classItem.instructor || 'Gabi',
      location: classItem.location || 'Main Studio',
      category: classItem.category || 'general',
      level: classItem.level || 'All Levels',
      createdAt: new Date().toISOString(),
      // If this was a paid class, we would include payment info here
      price: classItem.price || 0,
      paidStatus: classItem.price > 0 ? 'pending' : 'free'
    };

    await dynamoDb.put({
      TableName: process.env.BOOKINGS_TABLE,
      Item: booking
    }).promise();

    logWithContext('info', 'Class booked successfully', { 
      requestId, 
      userId, 
      classId, 
      reinstated: !!canceledBooking 
    });

    // Fetch user details for confirmation email
    try {
      // Get full user data to access email and firstName
      const userResult = await dynamoDb.get({
        TableName: process.env.USERS_TABLE,
        Key: { id: userId }
      }).promise();
      
      if (userResult.Item) {
        await emailService.sendBookingConfirmationEmail(
          userResult.Item.email, 
          userResult.Item.firstName,
          booking
        );
        
        logWithContext('info', 'Booking confirmation email sent', { 
          requestId, 
          userId, 
          classId 
        });
      }
    } catch (emailError) {
      // Log error but don't fail the request if email sending fails
      logWithContext('error', 'Failed to send booking confirmation email', { 
        requestId, 
        userId, 
        classId,
        error: emailError.message 
      });
    }

    return createSuccessResponse({
      message: canceledBooking ? 'Your booking has been reinstated!' : 'Class booked successfully',
      booking
    });

  } catch (error) {
    logWithContext('error', 'Error booking class', { 
      requestId, 
      error: error.message,
      stack: error.stack 
    });

    return createErrorResponse('An error occurred while booking the class', 500);
  }
};

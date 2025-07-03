/**
 * Cancel Booking Lambda Function
 * Handles canceling a user's booking for a class
 */

const { 
  createSuccessResponse, 
  createErrorResponse,
  logWithContext,
  dynamoUtils,
  getUserFromToken
} = require('../shared/public-utils');
const AWS = require('aws-sdk');
const dynamoDb = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event, context) => {
  const requestId = context.awsRequestId;
  
  try {
    logWithContext('info', 'Cancel booking request received', { requestId });

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
      logWithContext('error', 'Unauthorized booking cancellation request', { requestId });
      return createErrorResponse('Unauthorized. Please log in to cancel a booking.', 401);
    }

    // Get booking ID from path parameters
    const bookingId = event.pathParameters?.id;
    if (!bookingId) {
      return createErrorResponse('Missing booking ID', 400);
    }

    // Get the booking to verify ownership
    const getResult = await dynamoDb.get({
      TableName: process.env.BOOKINGS_TABLE,
      Key: { id: bookingId }
    }).promise();

    const booking = getResult.Item;
    if (!booking) {
      logWithContext('error', 'Booking not found', { requestId, bookingId });
      return createErrorResponse('Booking not found', 404);
    }

    // Check if the booking belongs to the authenticated user
    if (booking.userId !== userId) {
      logWithContext('error', 'User attempted to cancel another user\'s booking', { 
        requestId, bookingId, userId, bookingUserId: booking.userId 
      });
      return createErrorResponse('You can only cancel your own bookings', 403);
    }

    // Check cancellation policy (if it's too close to the class time)
    // In a real-world scenario, you might want to enforce a cancellation window
    // e.g., users can only cancel X hours before the class starts
    const classDate = new Date(`${booking.date}T${booking.time}`);
    const now = new Date();
    const hoursDifference = (classDate - now) / (1000 * 60 * 60);

    // Example: 2-hour cancellation window
    const cancellationWindowHours = 2;
    if (hoursDifference < cancellationWindowHours) {
      logWithContext('error', 'Cannot cancel booking within cancellation window', { 
        requestId, bookingId, hoursDifference, cancellationWindowHours 
      });
      return createErrorResponse(`Cannot cancel a class less than ${cancellationWindowHours} hours before the start time`, 400);
    }

    // If the booking is confirmed, handle waitlist processing
    if (booking.status === 'confirmed') {
      // Check if there are waitlisted users who can now book the class
      // Due to GSI key schema requiring createdAt, we need to use a different approach
      const waitlistParams = {
        TableName: process.env.BOOKINGS_TABLE,
        IndexName: 'ClassBookingsIndex',
        KeyConditionExpression: 'classId = :classId',
        FilterExpression: '#status = :status',
        ExpressionAttributeValues: {
          ':classId': booking.classId,
          ':status': 'waitlisted'
        },
        ExpressionAttributeNames: {
          '#status': 'status'
        }
      };
      
      const waitlistResponse = await dynamoDb.query(waitlistParams).promise();
      const waitlistedBookings = waitlistResponse.Items || [];

      // Waitlisted bookings are already retrieved above
      if (waitlistedBookings.length > 0) {
        // Sort waitlist by position
        waitlistedBookings.sort((a, b) => a.waitlistPosition - b.waitlistPosition);
        
        // Move the first waitlisted booking to confirmed
        const nextBooking = waitlistedBookings[0];
        
        await dynamoDb.update({
          TableName: process.env.BOOKINGS_TABLE,
          Key: { id: nextBooking.id },
          UpdateExpression: 'SET #status = :newStatus, updatedAt = :updatedAt REMOVE waitlistPosition',
          ExpressionAttributeNames: {
            '#status': 'status'
          },
          ExpressionAttributeValues: {
            ':newStatus': 'confirmed',
            ':updatedAt': new Date().toISOString()
          }
        }).promise();
        
        logWithContext('info', 'Moved waitlisted booking to confirmed', { 
          requestId, nextBookingId: nextBooking.id, userId: nextBooking.userId 
        });
        
        // In a real implementation, we would notify the waitlisted user here
        // await sendConfirmationEmail(nextBooking.userId, nextBooking);
      }
    }

    // Update the booking status to canceled
    await dynamoDb.update({
      TableName: process.env.BOOKINGS_TABLE,
      Key: { id: bookingId },
      UpdateExpression: 'SET #status = :canceledStatus, canceledAt = :canceledAt, updatedAt = :updatedAt',
      ExpressionAttributeNames: {
        '#status': 'status'
      },
      ExpressionAttributeValues: {
        ':canceledStatus': 'canceled',
        ':canceledAt': new Date().toISOString(),
        ':updatedAt': new Date().toISOString()
      }
    }).promise();

    logWithContext('info', 'Booking successfully canceled', { requestId, bookingId, userId });

    return createSuccessResponse({
      message: 'Booking successfully canceled',
      bookingId,
      className: booking.className,
      date: booking.date,
      time: booking.time,
      canceledAt: new Date().toISOString()
    });

  } catch (error) {
    logWithContext('error', 'Error canceling booking', { 
      requestId, 
      error: error.message,
      stack: error.stack 
    });

    return createErrorResponse('An error occurred while canceling your booking', 500);
  }
};

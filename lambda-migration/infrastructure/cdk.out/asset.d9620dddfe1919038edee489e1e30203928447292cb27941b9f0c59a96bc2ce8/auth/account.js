/**
 * Account Management Lambda Function
 * Handles deleting user accounts and associated data
 */

const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB.DocumentClient();
const { 
    createSuccessResponse, 
    createErrorResponse,
    logWithContext,
    getUserFromToken 
} = require('../shared/public-utils');

exports.handler = async (event, context) => {
    const requestId = context.awsRequestId;
    
    try {
        // Handle CORS preflight
        if (event.httpMethod === 'OPTIONS') {
            return createSuccessResponse({}, 200);
        }

        // Get user from token
        const user = await getUserFromToken(event);
        if (!user) {
            return createErrorResponse('Unauthorized', 401);
        }

        // Currently only supporting DELETE operation
        if (event.httpMethod === 'DELETE') {
            // Start transaction to delete user data
            logWithContext('info', 'Processing account deletion request', { 
                requestId, 
                userId: user.id 
            });

            // 1. Delete user's bookings
            let bookingsDeleted = false;
            try {
                // Get all user bookings
                const bookings = await dynamodb.query({
                    TableName: process.env.BOOKINGS_TABLE,
                    IndexName: 'UserIndex',
                    KeyConditionExpression: 'userId = :userId',
                    ExpressionAttributeValues: {
                        ':userId': user.id
                    }
                }).promise();

                // Delete each booking
                if (bookings.Items && bookings.Items.length > 0) {
                    await Promise.all(bookings.Items.map(booking => 
                        dynamodb.delete({
                            TableName: process.env.BOOKINGS_TABLE,
                            Key: { id: booking.id }
                        }).promise()
                    ));
                }
                
                bookingsDeleted = true;
                logWithContext('info', 'User bookings deleted', { 
                    requestId, 
                    userId: user.id,
                    bookingsCount: bookings.Items ? bookings.Items.length : 0
                });
            } catch (error) {
                logWithContext('error', 'Failed to delete user bookings', { 
                    requestId, 
                    userId: user.id,
                    error: error.message
                });
            }

            // 2. Delete other user data like payment methods, preferences, etc.
            // ... implement additional data deletion as needed ...

            // 3. Finally delete the user account
            await dynamodb.delete({
                TableName: process.env.USERS_TABLE,
                Key: { id: user.id }
            }).promise();

            logWithContext('info', 'User account deleted', { 
                requestId, 
                userId: user.id,
                bookingsDeleted
            });

            return createSuccessResponse({ 
                message: 'Account deleted successfully',
                userId: user.id
            });
        }

        return createErrorResponse(`Method ${event.httpMethod} not allowed`, 405);
    } catch (error) {
        logWithContext('error', 'Account operation error', { 
            requestId, 
            error: error.message,
            stack: error.stack
        });
        return createErrorResponse('An error occurred while processing your request', 500);
    }
};

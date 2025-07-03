/**
 * User Profile Lambda Function
 * Handles retrieving and updating user profile information
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

        switch (event.httpMethod) {
            case 'GET':
                // Return user profile data
                return createSuccessResponse({
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    phone: user.phone,
                    preferences: user.preferences,
                    notifications: user.notifications,
                    role: user.role,
                    createdAt: user.createdAt
                });

            case 'PUT':
                // Update user profile
                const updates = JSON.parse(event.body);
                const allowedUpdates = ['name', 'phone', 'preferences', 'notifications'];
                const updateExpressions = [];
                const expressionAttributeNames = {};
                const expressionAttributeValues = {};

                Object.keys(updates).forEach(key => {
                    if (allowedUpdates.includes(key) && updates[key] !== undefined) {
                        updateExpressions.push(`#${key} = :${key}`);
                        expressionAttributeNames[`#${key}`] = key;
                        expressionAttributeValues[`:${key}`] = updates[key];
                    }
                });

                if (updateExpressions.length === 0) {
                    return createErrorResponse('No valid updates provided', 400);
                }

                const params = {
                    TableName: process.env.USERS_TABLE,
                    Key: { id: user.id },
                    UpdateExpression: `SET ${updateExpressions.join(', ')}`,
                    ExpressionAttributeNames: expressionAttributeNames,
                    ExpressionAttributeValues: expressionAttributeValues,
                    ReturnValues: 'ALL_NEW'
                };

                const result = await dynamodb.update(params).promise();
                return createSuccessResponse(result.Attributes);

            default:
                return createErrorResponse(`Method ${event.httpMethod} not allowed`, 405);
        }
    } catch (error) {
        logWithContext('error', 'Profile operation error', { 
            requestId, 
            error: error.message 
        });
        return createErrorResponse('An error occurred while processing your request', 500);
    }
};

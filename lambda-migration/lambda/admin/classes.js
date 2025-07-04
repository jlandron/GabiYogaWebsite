const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');
const { 
    getUserFromToken, 
    isAdmin, 
    createSuccessResponse, 
    createErrorResponse,
    logWithContext
} = require('../shared/utils');

const dynamodb = new AWS.DynamoDB.DocumentClient();
const emailService = require('../shared/email-service');

exports.handler = async (event) => {
    console.log('Event:', JSON.stringify(event, null, 2));
    
    try {
        // Handle CORS preflight
        if (event.httpMethod === 'OPTIONS') {
            return createSuccessResponse({}, 200);
        }

        // Verify admin role
        const user = await getUserFromToken(event);
        if (!user || !isAdmin(user)) {
            return createErrorResponse('Unauthorized - Admin access required', 403);
        }

        switch (event.httpMethod) {
            case 'GET':
                return await handleGetClasses(event);
            case 'POST':
                return await handleCreateClass(event, user);
            case 'PUT':
                return await handleUpdateClass(event, user);
            case 'DELETE':
                return await handleDeleteClass(event);
            default:
                return createErrorResponse(`Method ${event.httpMethod} not allowed`, 405);
        }
    } catch (error) {
        console.error('Error:', error);
        return createErrorResponse('Internal server error', 500);
    }
};

async function handleGetClasses(event) {
    const classId = event.pathParameters?.id;
    
    if (classId) {
        // Get specific class
        const result = await dynamodb.get({
            TableName: process.env.CLASSES_TABLE,
            Key: { id: classId }
        }).promise();

        if (!result.Item) {
            return createErrorResponse('Class not found', 404);
        }

        return createSuccessResponse({ class: result.Item });
    }

    // List all classes
    const result = await dynamodb.scan({
        TableName: process.env.CLASSES_TABLE
    }).promise();

    return createSuccessResponse({ 
        classes: result.Items || [],
        count: result.Count || 0
    });
}

async function handleCreateClass(event, user) {
    const classData = JSON.parse(event.body);
    const timestamp = new Date().toISOString();

    // Validate required fields
    const requiredFields = ['title', 'scheduleDate', 'startTime', 'endTime', 'maxParticipants'];
    const missingFields = requiredFields.filter(field => !classData[field]);
    
    if (missingFields.length > 0) {
        return createErrorResponse(`Missing required fields: ${missingFields.join(', ')}`, 400);
    }

    const newClass = {
        id: uuidv4(),
        ...classData,
        status: 'active',
        createdAt: timestamp,
        updatedAt: timestamp,
        createdBy: user.id
    };

    await dynamodb.put({
        TableName: process.env.CLASSES_TABLE,
        Item: newClass
    }).promise();

    return createSuccessResponse({
        message: 'Class created successfully',
        class: newClass
    });
}

async function handleUpdateClass(event, user) {
    const classId = event.pathParameters?.id;
    if (!classId) {
        return createErrorResponse('Class ID is required', 400);
    }

    const updates = JSON.parse(event.body);
    const timestamp = new Date().toISOString();

    // Get existing class
    const existingClass = await dynamodb.get({
        TableName: process.env.CLASSES_TABLE,
        Key: { id: classId }
    }).promise();

    if (!existingClass.Item) {
        return createErrorResponse('Class not found', 404);
    }

    // Build update expression
    const updateExpressions = [];
    const expressionAttributeNames = {};
    const expressionAttributeValues = {};

    Object.entries(updates).forEach(([key, value]) => {
        if (key !== 'id' && key !== 'createdAt' && key !== 'createdBy') {
            updateExpressions.push(`#${key} = :${key}`);
            expressionAttributeNames[`#${key}`] = key;
            expressionAttributeValues[`:${key}`] = value;
        }
    });

    // Add updatedAt
    updateExpressions.push('#updatedAt = :updatedAt');
    expressionAttributeNames['#updatedAt'] = 'updatedAt';
    expressionAttributeValues[':updatedAt'] = timestamp;

    const updateParams = {
        TableName: process.env.CLASSES_TABLE,
        Key: { id: classId },
        UpdateExpression: `SET ${updateExpressions.join(', ')}`,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
        ReturnValues: 'ALL_NEW'
    };

    const result = await dynamodb.update(updateParams).promise();

    return createSuccessResponse({
        message: 'Class updated successfully',
        class: result.Attributes
    });
}

async function handleDeleteClass(event) {
    const classId = event.pathParameters?.id;
    if (!classId) {
        return createErrorResponse('Class ID is required', 400);
    }

    // Check if class exists
    const existingClass = await dynamodb.get({
        TableName: process.env.CLASSES_TABLE,
        Key: { id: classId }
    }).promise();

    if (!existingClass.Item) {
        return createErrorResponse('Class not found', 404);
    }

    const classDetails = existingClass.Item;
    const requestId = event.requestContext?.requestId || 'unknown';

    try {
        // Find all bookings for this class
        const bookingsParams = {
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
        
        const bookingsResult = await dynamodb.query(bookingsParams).promise();
        const bookings = bookingsResult.Items || [];
        
        logWithContext('info', `Found ${bookings.length} bookings for class being deleted`, { 
            requestId,
            classId,
            className: classDetails.title
        });

        // Delete the class
        await dynamodb.delete({
            TableName: process.env.CLASSES_TABLE,
            Key: { id: classId }
        }).promise();
        
        // Collect user details for all bookings
        const userPromises = bookings.map(async (booking) => {
            // Get user details
            const userResult = await dynamodb.get({
                TableName: process.env.USERS_TABLE,
                Key: { id: booking.userId }
            }).promise();
            
            // Update booking status to cancelled
            await dynamodb.update({
                TableName: process.env.BOOKINGS_TABLE,
                Key: { id: booking.id },
                UpdateExpression: 'SET #status = :status, updatedAt = :updatedAt, cancelReason = :cancelReason',
                ExpressionAttributeNames: {
                    '#status': 'status'
                },
                ExpressionAttributeValues: {
                    ':status': 'canceled',
                    ':updatedAt': new Date().toISOString(),
                    ':cancelReason': 'Class cancelled by admin'
                }
            }).promise();
            
            return userResult.Item || null;
        });
        
        // Process all user details updates
        const users = (await Promise.all(userPromises)).filter(user => user !== null);
        
        // Send cancellation emails to all affected users using the batch method
        if (users.length > 0) {
            // Process emails in the background without waiting for completion
            emailService.sendClassCancellationEmailsToAll(classDetails, users)
                .then(results => {
                    logWithContext('info', `Class cancellation notifications: ${results.success} sent, ${results.failed} failed`, { 
                        requestId,
                        classId
                    });
                    
                    if (results.errors.length > 0) {
                        logWithContext('warn', 'Some cancellation emails failed to send', {
                            requestId,
                            classId,
                            errors: results.errors
                        });
                    }
                })
                .catch(error => {
                    logWithContext('error', 'Error in cancellation notification batch', { 
                        requestId,
                        classId,
                        error: error.message
                    });
                });
        }
        
        return createSuccessResponse({
            message: `Class deleted successfully. ${bookings.length} affected bookings are being cancelled.`,
            classId
        });
    } catch (error) {
        logWithContext('error', 'Error deleting class', { 
            requestId,
            classId,
            error: error.message
        });
        return createErrorResponse(`Failed to delete class: ${error.message}`, 500);
    }
}

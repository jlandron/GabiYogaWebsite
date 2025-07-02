const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB.DocumentClient();
const { getUserFromToken, isAdmin, createErrorResponse } = require('../shared/utils');

const CORS_HEADERS = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'PUT, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

const makeAdmin = async (userId) => {
    const params = {
        TableName: process.env.USERS_TABLE,
        Key: { id: userId },
        UpdateExpression: 'SET #role = :role',
        ExpressionAttributeNames: {
            '#role': 'role'
        },
        ExpressionAttributeValues: {
            ':role': 'admin'
        },
        ReturnValues: 'ALL_NEW'
    };

    const result = await dynamodb.update(params).promise();
    return result.Attributes;
};

exports.handler = async (event) => {
    console.log('Event:', JSON.stringify(event, null, 2));
    
    try {
        const { httpMethod, pathParameters } = event;
        
        // Handle OPTIONS for CORS
        if (httpMethod === 'OPTIONS') {
            return {
                statusCode: 200,
                headers: CORS_HEADERS,
                body: ''
            };
        }

        // Verify admin role
        const user = await getUserFromToken(event);
        if (!user || !isAdmin(user)) {
            return createErrorResponse('Unauthorized - Admin access required', 403);
        }

        if (httpMethod !== 'PUT') {
            return createErrorResponse(`Unsupported method: ${httpMethod}`, 405);
        }

        if (!pathParameters?.userId) {
            return createErrorResponse('User ID is required', 400);
        }

        const updatedUser = await makeAdmin(pathParameters.userId);

        return {
            statusCode: 200,
            headers: CORS_HEADERS,
            body: JSON.stringify({
                message: 'User role updated successfully',
                user: updatedUser
            })
        };
    } catch (error) {
        console.error('Error:', error);
        
        return {
            statusCode: error.message === 'User not found' ? 404 : 500,
            headers: CORS_HEADERS,
            body: JSON.stringify({
                message: error.message,
                error: error.name
            })
        };
    }
};

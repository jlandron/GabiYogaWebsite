const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB.DocumentClient();

const CORS_HEADERS = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

const listUsers = async (limit = 50, lastEvaluatedKey = null, searchTerm = '') => {
    let params = {
        TableName: process.env.USERS_TABLE,
        Limit: limit
    };

    if (lastEvaluatedKey) {
        params.ExclusiveStartKey = JSON.parse(Buffer.from(lastEvaluatedKey, 'base64').toString());
    }

    if (searchTerm) {
        params = {
            ...params,
            FilterExpression: 'contains(#email, :search) OR contains(#name, :search)',
            ExpressionAttributeNames: {
                '#email': 'email',
                '#name': 'name'
            },
            ExpressionAttributeValues: {
                ':search': searchTerm.toLowerCase()
            }
        };
    }

    const result = await dynamodb.scan(params).promise();
    
    return {
        users: result.Items.map(user => ({
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            createdAt: user.createdAt,
            lastLogin: user.lastLogin
        })),
        nextToken: result.LastEvaluatedKey 
            ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64')
            : null
    };
};

const getUser = async (userId) => {
    const params = {
        TableName: process.env.USERS_TABLE,
        Key: { id: userId }
    };
    
    const result = await dynamodb.get(params).promise();
    if (!result.Item) {
        throw new Error('User not found');
    }
    
    return result.Item;
};

const updateUser = async (userId, updates) => {
    const allowedUpdates = ['name', 'role', 'status'];
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
        throw new Error('No valid updates provided');
    }

    const params = {
        TableName: process.env.USERS_TABLE,
        Key: { id: userId },
        UpdateExpression: `SET ${updateExpressions.join(', ')}`,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
        ReturnValues: 'ALL_NEW'
    };

    const result = await dynamodb.update(params).promise();
    return result.Attributes;
};

const deleteUser = async (userId) => {
    // First check if user exists
    await getUser(userId);

    const params = {
        TableName: process.env.USERS_TABLE,
        Key: { id: userId }
    };

    await dynamodb.delete(params).promise();
    return true;
};

exports.handler = async (event) => {
    console.log('Event:', JSON.stringify(event, null, 2));
    
    try {
        const { httpMethod, pathParameters, queryStringParameters, body } = event;
        
        // Handle OPTIONS for CORS
        if (httpMethod === 'OPTIONS') {
            return {
                statusCode: 200,
                headers: CORS_HEADERS,
                body: ''
            };
        }

        let response;
        
        switch (httpMethod) {
            case 'GET':
                if (pathParameters && pathParameters.userId) {
                    // Get specific user
                    response = await getUser(pathParameters.userId);
                } else {
                    // List users with optional pagination and search
                    const limit = queryStringParameters?.limit ? parseInt(queryStringParameters.limit) : 50;
                    const lastKey = queryStringParameters?.nextToken || null;
                    const search = queryStringParameters?.search || '';
                    response = await listUsers(limit, lastKey, search);
                }
                break;

            case 'PUT':
                if (!pathParameters?.userId) {
                    throw new Error('User ID is required');
                }
                const updates = JSON.parse(body);
                response = await updateUser(pathParameters.userId, updates);
                break;

            case 'DELETE':
                if (!pathParameters?.userId) {
                    throw new Error('User ID is required');
                }
                await deleteUser(pathParameters.userId);
                response = { message: 'User deleted successfully' };
                break;

            default:
                throw new Error(`Unsupported method: ${httpMethod}`);
        }

        return {
            statusCode: 200,
            headers: CORS_HEADERS,
            body: JSON.stringify(response)
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

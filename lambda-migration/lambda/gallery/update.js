const AWS = require('aws-sdk');
const { 
    getUserFromToken, 
    isAdmin, 
    createSuccessResponse, 
    createErrorResponse 
} = require('../shared/utils');

const dynamodb = new AWS.DynamoDB.DocumentClient();

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

        const imageId = event.pathParameters?.id;
        if (!imageId) {
            return createErrorResponse('Image ID is required', 400);
        }

        const updates = JSON.parse(event.body);
        if (!updates || Object.keys(updates).length === 0) {
            return createErrorResponse('No update data provided', 400);
        }

        // Get the existing image
        const getParams = {
            TableName: process.env.GALLERY_TABLE,
            Key: { id: imageId }
        };

        const result = await dynamodb.get(getParams).promise();
        const image = result.Item;

        if (!image) {
            return createErrorResponse('Image not found', 404);
        }

        // Prepare update expression
        const timestamp = new Date().toISOString();
        const updateExpressionParts = [];
        const expressionAttributeNames = {};
        const expressionAttributeValues = {
            ':updatedAt': timestamp
        };

        // Set updatedAt time
        updateExpressionParts.push('#updatedAt = :updatedAt');
        expressionAttributeNames['#updatedAt'] = 'updatedAt';

        // Add other fields
        const allowedFields = ['title', 'description', 'altText', 'category', 'featured', 'displayOrder'];
        
        allowedFields.forEach(field => {
            if (updates[field] !== undefined) {
                const expressionName = `#${field}`;
                const expressionValue = `:${field}`;
                
                updateExpressionParts.push(`${expressionName} = ${expressionValue}`);
                expressionAttributeNames[expressionName] = field;
                expressionAttributeValues[expressionValue] = updates[field];
            }
        });

        // Create update expression
        const updateExpression = 'SET ' + updateExpressionParts.join(', ');

        // Update DynamoDB
        const updateParams = {
            TableName: process.env.GALLERY_TABLE,
            Key: { id: imageId },
            UpdateExpression: updateExpression,
            ExpressionAttributeNames: expressionAttributeNames,
            ExpressionAttributeValues: expressionAttributeValues,
            ReturnValues: 'ALL_NEW'
        };

        const updateResult = await dynamodb.update(updateParams).promise();
        const updatedImage = updateResult.Attributes;

        return createSuccessResponse({
            message: 'Image metadata updated successfully',
            image: updatedImage
        });

    } catch (error) {
        console.error('Error:', error);
        return createErrorResponse('Error updating image metadata', 500);
    }
};

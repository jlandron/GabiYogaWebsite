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

        const imageData = JSON.parse(event.body);
        const {
            imageUrl,
            s3Key,
            s3Bucket,
            title,
            description,
            altText,
            category,
            featured,
            displayOrder
        } = imageData;

        if (!imageUrl || !s3Key || !s3Bucket) {
            return createErrorResponse('Image URL, S3 key, and bucket are required', 400);
        }

        const timestamp = new Date().toISOString();
        const imageId = s3Key.split('/').pop().split('.')[0]; // Use the UUID from the S3 key

        const item = {
            id: imageId,
            imageUrl,
            s3Key,
            s3Bucket,
            title: title || '',
            description: description || '',
            altText: altText || title || '',
            category: category || 'general',
            featured: featured || false,
            displayOrder: displayOrder || 0,
            status: 'active',
            createdAt: timestamp,
            updatedAt: timestamp,
            createdBy: user.id
        };

        await dynamodb.put({
            TableName: process.env.GALLERY_TABLE,
            Item: item
        }).promise();

        return createSuccessResponse({
            message: 'Image metadata saved successfully',
            image: item
        });

    } catch (error) {
        console.error('Error:', error);
        return createErrorResponse('Error saving image metadata', 500);
    }
};

const AWS = require('aws-sdk');
const { 
    getUserFromToken, 
    isAdmin, 
    createSuccessResponse, 
    createErrorResponse 
} = require('../shared/utils');

const s3 = new AWS.S3();
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

        // Get image metadata from DynamoDB
        const getParams = {
            TableName: process.env.GALLERY_TABLE,
            Key: { id: imageId }
        };

        const result = await dynamodb.get(getParams).promise();
        const image = result.Item;

        if (!image) {
            return createErrorResponse('Image not found', 404);
        }

        // Delete from S3 if s3Key exists
        if (image.s3Key && image.s3Bucket) {
            try {
                await s3.deleteObject({
                    Bucket: image.s3Bucket,
                    Key: image.s3Key
                }).promise();
            } catch (s3Error) {
                console.error('Error deleting from S3:', s3Error);
                // Continue with DynamoDB deletion even if S3 deletion fails
            }
        }

        // Delete from DynamoDB
        const deleteParams = {
            TableName: process.env.GALLERY_TABLE,
            Key: { id: imageId }
        };

        await dynamodb.delete(deleteParams).promise();

        return createSuccessResponse({
            message: 'Image deleted successfully',
            imageId
        });

    } catch (error) {
        console.error('Error:', error);
        return createErrorResponse('Error deleting image', 500);
    }
};

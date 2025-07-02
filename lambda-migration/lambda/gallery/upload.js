const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');
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

        const { filename, contentType } = JSON.parse(event.body);
        if (!filename || !contentType) {
            return createErrorResponse('Filename and content type are required', 400);
        }

        // Generate unique S3 key
        const fileExtension = filename.split('.').pop().toLowerCase();
        const s3Key = `gallery/${uuidv4()}.${fileExtension}`;
        const bucket = process.env.ASSETS_BUCKET;

        // Generate presigned URL for upload
        const presignedUrl = await s3.getSignedUrlPromise('putObject', {
            Bucket: bucket,
            Key: s3Key,
            ContentType: contentType,
            Expires: 3600, // URL expires in 1 hour
            Metadata: {
                originalname: filename
            }
        });

        // Generate the final image URL
        const imageUrl = `https://${bucket}.s3.amazonaws.com/${s3Key}`;

        return createSuccessResponse({
            uploadUrl: presignedUrl,
            imageUrl: imageUrl,
            s3Key: s3Key,
            bucket: bucket
        });

    } catch (error) {
        console.error('Error:', error);
        return createErrorResponse('Error generating upload URL', 500);
    }
};

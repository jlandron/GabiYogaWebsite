const AWS = require('aws-sdk');
const { 
    createSuccessResponse, 
    createErrorResponse,
    validateToken,
    logWithContext
} = require('../shared/public-utils');

const dynamoDB = new AWS.DynamoDB.DocumentClient();
const s3 = new AWS.S3();

exports.handler = async (event, context) => {
    const requestId = context.awsRequestId;
    
    try {
        // Verify admin authentication
        const user = await validateToken(event.headers.Authorization);
        if (!user || user.role !== 'admin') {
            return createErrorResponse('Unauthorized - Admin access required', 403);
        }

        // Get post ID from path parameters
        const postId = event.pathParameters.id;
        if (!postId) {
            return createErrorResponse('Post ID is required', 400);
        }

        // Get existing post
        const existingPost = await dynamoDB.get({
            TableName: process.env.BLOG_POSTS_TABLE,
            Key: { id: postId }
        }).promise();

        if (!existingPost.Item) {
            return createErrorResponse('Blog post not found', 404);
        }

        // Delete cover image from S3 if exists
        if (existingPost.Item.coverImage) {
            try {
                await s3.deleteObject({
                    Bucket: process.env.ASSETS_BUCKET,
                    Key: existingPost.Item.coverImage
                }).promise();
                
                logWithContext('info', 'Cover image deleted successfully', { 
                    requestId, 
                    postId,
                    imageKey: existingPost.Item.coverImage 
                });
            } catch (s3Error) {
                // Log error but continue with post deletion
                logWithContext('warn', 'Error deleting cover image', { 
                    requestId, 
                    postId,
                    imageKey: existingPost.Item.coverImage,
                    error: s3Error.message 
                });
            }
        }

        // Delete post from DynamoDB
        await dynamoDB.delete({
            TableName: process.env.BLOG_POSTS_TABLE,
            Key: { id: postId }
        }).promise();

        logWithContext('info', 'Blog post deleted successfully', { requestId, postId });

        return createSuccessResponse({
            message: 'Blog post deleted successfully',
            postId
        });

    } catch (error) {
        logWithContext('error', 'Error deleting blog post', { 
            requestId, 
            error: error.message,
            stack: error.stack
        });

        return createErrorResponse('Error deleting blog post', 500);
    }
};

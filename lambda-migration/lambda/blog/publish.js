const AWS = require('aws-sdk');
const { 
    createSuccessResponse, 
    createErrorResponse,
    validateToken,
    logWithContext
} = require('../shared/public-utils');

const dynamoDB = new AWS.DynamoDB.DocumentClient();

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

        // Parse request body for optional publish date
        const body = event.body ? JSON.parse(event.body) : {};
        const publishedAt = body.publishedAt || new Date().toISOString();

        // Update post status
        const updatedPost = {
            ...existingPost.Item,
            status: 'published',
            publishedAt,
            updatedAt: new Date().toISOString()
        };

        // Save to DynamoDB
        await dynamoDB.put({
            TableName: process.env.BLOG_POSTS_TABLE,
            Item: updatedPost
        }).promise();

        logWithContext('info', 'Blog post published successfully', { 
            requestId, 
            postId,
            publishedAt 
        });

        return createSuccessResponse({
            message: 'Blog post published successfully',
            post: updatedPost
        });

    } catch (error) {
        logWithContext('error', 'Error publishing blog post', { 
            requestId, 
            error: error.message,
            stack: error.stack
        });

        return createErrorResponse('Error publishing blog post', 500);
    }
};

const AWS = require('aws-sdk');
const { 
    createSuccessResponse, 
    createErrorResponse,
    getUserFromToken,
    logWithContext
} = require('../shared/utils');
const { getImageUrl } = require('../shared/image-utils');

const dynamoDB = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event, context) => {
    const requestId = context.awsRequestId;
    
    try {
        // Verify admin authentication
        const user = await getUserFromToken(event);
        if (!user || user.role !== 'admin') {
            return createErrorResponse('Unauthorized - Admin access required', 403);
        }

        // Get post ID from path parameters
        const postId = event.pathParameters.id;
        if (!postId) {
            return createErrorResponse('Post ID is required', 400);
        }

        // Parse request body
        const body = JSON.parse(event.body);
        
        // Validate required fields
        if (!body.title || !body.content) {
            return createErrorResponse('Title and content are required', 400);
        }

        // Get existing post
        const existingPost = await dynamoDB.get({
            TableName: process.env.BLOG_POSTS_TABLE,
            Key: { id: postId }
        }).promise();

        if (!existingPost.Item) {
            return createErrorResponse('Blog post not found', 404);
        }

        // Generate new slug if title changed
        const slug = body.title !== existingPost.Item.title
            ? body.title
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/(^-|-$)/g, '')
            : existingPost.Item.slug;

        // Update post
        const timestamp = new Date().toISOString();
        const updatedPost = {
            ...existingPost.Item,
            title: body.title,
            slug,
            content: body.content,
            excerpt: body.excerpt || body.content.substring(0, 200) + '...',
            coverImage: body.coverImage || existingPost.Item.coverImage,
            category: body.category || existingPost.Item.category,
            tags: body.tags || existingPost.Item.tags,
            updatedAt: timestamp
        };

        // For the response, add presigned URLs for images
        const responsePost = { ...updatedPost };
        if (responsePost.coverImage) {
            responsePost.coverImageUrl = getImageUrl(responsePost.coverImage);
        }

        // Save to DynamoDB
        await dynamoDB.put({
            TableName: process.env.BLOG_POSTS_TABLE,
            Item: updatedPost
        }).promise();

        logWithContext('info', 'Blog post updated successfully', { requestId, postId });

        return createSuccessResponse({
            message: 'Blog post updated successfully',
            post: responsePost
        });

    } catch (error) {
        logWithContext('error', 'Error updating blog post', { 
            requestId, 
            error: error.message,
            stack: error.stack
        });

        return createErrorResponse('Error updating blog post', 500);
    }
};

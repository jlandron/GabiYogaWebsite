const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');
const { 
    createSuccessResponse, 
    createErrorResponse,
    getUserFromToken,
    logWithContext
} = require('../shared/utils');
const { processImage, getImageUrl } = require('../shared/image-utils');

const dynamoDB = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event, context) => {
    const requestId = context.awsRequestId;
    
    try {
        // Verify admin authentication
        const user = await getUserFromToken(event);
        if (!user || user.role !== 'admin') {
            return createErrorResponse('Unauthorized - Admin access required', 403);
        }

        // Parse request body
        const body = JSON.parse(event.body);
        
        // Validate required fields
        if (!body.title || !body.content) {
            return createErrorResponse('Title and content are required', 400);
        }

        // Generate slug from title
        const slug = body.title
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '');

        // Generate a new post ID
        const postId = uuidv4();

        // Create blog post
        const timestamp = new Date().toISOString();
        const post = {
            id: postId,
            title: body.title,
            slug,
            content: body.content,
            excerpt: body.excerpt || body.content.substring(0, 200) + '...',
            coverImage: body.coverImage,
            category: body.category || 'General',
            tags: body.tags || [],
            status: 'draft',
            createdAt: timestamp,
            updatedAt: timestamp,
            author: {
                id: user.id,
                firstName: user.firstName || user.name.split(' ')[0],
                lastName: user.lastName || user.name.split(' ')[1] || ''
            }
        };

        // Save to DynamoDB
        await dynamoDB.put({
            TableName: process.env.BLOG_POSTS_TABLE,
            Item: post
        }).promise();

        logWithContext('info', 'Blog post created successfully', { requestId, postId: post.id });

        // For the response, add presigned URLs for images
        const responsePost = { ...post };
        if (responsePost.coverImage) {
            responsePost.coverImageUrl = getImageUrl(responsePost.coverImage);
        }

        return createSuccessResponse({
            message: 'Blog post created successfully',
            post: responsePost
        });

    } catch (error) {
        logWithContext('error', 'Error creating blog post', { 
            requestId, 
            error: error.message,
            stack: error.stack
        });

        return createErrorResponse('Error creating blog post', 500);
    }
};

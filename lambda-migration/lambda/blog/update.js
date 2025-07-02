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

        // Handle cover image if provided
        let coverImage = existingPost.Item.coverImage;
        if (body.coverImage && body.coverImage !== existingPost.Item.coverImage) {
            // Delete old cover image if exists
            if (existingPost.Item.coverImage) {
                await s3.deleteObject({
                    Bucket: process.env.ASSETS_BUCKET,
                    Key: existingPost.Item.coverImage
                }).promise();
            }

            // Upload new cover image
            const matches = body.coverImage.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
            if (matches && matches.length === 3) {
                const fileType = matches[1];
                const buffer = Buffer.from(matches[2], 'base64');
                const key = `blog-covers/${postId}.${fileType.split('/')[1]}`;

                await s3.putObject({
                    Bucket: process.env.ASSETS_BUCKET,
                    Key: key,
                    Body: buffer,
                    ContentType: fileType
                }).promise();

                coverImage = key;
            }
        }

        // Update post
        const timestamp = new Date().toISOString();
        const updatedPost = {
            ...existingPost.Item,
            title: body.title,
            slug,
            content: body.content,
            excerpt: body.excerpt || body.content.substring(0, 200) + '...',
            coverImage,
            category: body.category || existingPost.Item.category,
            tags: body.tags || existingPost.Item.tags,
            updatedAt: timestamp
        };

        // Save to DynamoDB
        await dynamoDB.put({
            TableName: process.env.BLOG_POSTS_TABLE,
            Item: updatedPost
        }).promise();

        logWithContext('info', 'Blog post updated successfully', { requestId, postId });

        return createSuccessResponse({
            message: 'Blog post updated successfully',
            post: updatedPost
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

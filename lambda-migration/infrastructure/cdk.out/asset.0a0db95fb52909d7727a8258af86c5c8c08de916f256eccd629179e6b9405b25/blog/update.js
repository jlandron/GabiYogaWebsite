const AWS = require('aws-sdk');
const { 
    createSuccessResponse, 
    createErrorResponse,
    getUserFromToken,
    logWithContext
} = require('../shared/utils');
const { getImageUrl } = require('../shared/image-utils');
const { generateCdnUrl } = require('../shared/cdn-utils');

const dynamoDB = new AWS.DynamoDB.DocumentClient();
const s3 = new AWS.S3();

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

        // Validate status if provided
        if (body.status && !['draft', 'published'].includes(body.status)) {
            return createErrorResponse('Status must be either "draft" or "published"', 400);
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
        const isPublishing = body.status === 'published' && existingPost.Item.status !== 'published';
        
        const updatedPost = {
            ...existingPost.Item,
            title: body.title,
            slug,
            content: body.content,
            excerpt: body.excerpt || body.content.substring(0, 200) + '...',
            coverImage: body.coverImage || existingPost.Item.coverImage,
            category: body.category || existingPost.Item.category || 'General',
            tags: body.tags || existingPost.Item.tags || [],
            status: body.status || existingPost.Item.status,
            updatedAt: timestamp,
            // Set publishedAt when publishing for the first time
            ...(isPublishing && { publishedAt: timestamp })
        };

        // For the response, add image URLs consistent with other blog functions
        const responsePost = { ...updatedPost };
        let coverImage = null;
        if (responsePost.coverImage) {
            try {
                const s3Key = responsePost.coverImage.startsWith('/') ? responsePost.coverImage.substring(1) : responsePost.coverImage;
                const cdnUrl = generateCdnUrl(s3Key, { requestId, blogId: postId });
                
                let imageUrl;
                if (cdnUrl) {
                    imageUrl = cdnUrl;
                } else {
                    imageUrl = await s3.getSignedUrlPromise('getObject', {
                        Bucket: process.env.ASSETS_BUCKET,
                        Key: s3Key,
                        Expires: 3600
                    });
                }
                
                coverImage = {
                    s3Key: s3Key,
                    url: imageUrl
                };
            } catch (s3Error) {
                logWithContext('warn', 'Failed to generate image URL', {
                    requestId,
                    s3Key: responsePost.coverImage,
                    error: s3Error.message
                });
                coverImage = {
                    s3Key: responsePost.coverImage,
                    url: null
                };
            }
        }
        
        responsePost.coverImage = coverImage;
        delete responsePost.coverImageUrl;

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

const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');
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

        // Handle cover image if provided
        let coverImage = null;
        if (body.coverImage) {
            // Extract base64 data
            const matches = body.coverImage.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
            if (matches && matches.length === 3) {
                const fileType = matches[1];
                const buffer = Buffer.from(matches[2], 'base64');
                const key = `blog-covers/${uuidv4()}.${fileType.split('/')[1]}`;

                // Upload to S3
                await s3.putObject({
                    Bucket: process.env.ASSETS_BUCKET,
                    Key: key,
                    Body: buffer,
                    ContentType: fileType
                }).promise();

                coverImage = key;
            }
        }

        // Create blog post
        const timestamp = new Date().toISOString();
        const post = {
            id: uuidv4(),
            title: body.title,
            slug,
            content: body.content,
            excerpt: body.excerpt || body.content.substring(0, 200) + '...',
            coverImage,
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

        return createSuccessResponse({
            message: 'Blog post created successfully',
            post
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

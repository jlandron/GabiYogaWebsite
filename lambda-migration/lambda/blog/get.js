const { dynamoUtils, createSuccessResponse, createErrorResponse, logWithContext } = require('../shared/public-utils');
const AWS = require('aws-sdk');
const s3 = new AWS.S3();

exports.handler = async (event, context) => {
    console.log('Event:', JSON.stringify(event, null, 2));
    
    try {
        const slug = event.pathParameters?.id;
        if (!slug) {
            return createErrorResponse('Blog slug is required', 400);
        }

        // Query the blog post using the SlugIndex
        const posts = await dynamoUtils.queryItems(
            process.env.BLOG_POSTS_TABLE,
            'SlugIndex',
            '#slug = :slug',
            { ':slug': slug },
            { '#slug': 'slug' }
        );

        // Check if we found a post
        if (!posts || posts.length === 0) {
            return createErrorResponse('Blog post not found', 404);
        }

        // Since slug should be unique, we only need the first post
        const post = posts[0];

        // Only return published posts
        if (post.status !== 'published') {
            return createErrorResponse('Blog post not found', 404);
        }

        // Generate presigned URL for cover image
        let coverImage = null;
        if (post.coverImage) {
            try {
                // Clean the S3 key (remove leading slash if present)
                const s3Key = post.coverImage.startsWith('/') ? post.coverImage.substring(1) : post.coverImage;
                
                const presignedUrl = await s3.getSignedUrlPromise('getObject', {
                    Bucket: process.env.ASSETS_BUCKET,
                    Key: s3Key, // ✅ Use the cleaned string key
                    Expires: 3600 // 1 hour
                });
                
                coverImage = {
                    s3Key: s3Key,
                    url: presignedUrl
                };
            } catch (s3Error) {
                logWithContext('warn', 'Failed to generate presigned URL for cover image', {
                    requestId: context.awsRequestId,
                    s3Key: post.coverImage, // Log the original key
                    error: s3Error.message
                });
                // Fall back to null or original path
                coverImage = {
                    s3Key: post.coverImage,
                    url: null
                };
            }
        }

        // Create response object without modifying the original post
        const responsePost = {
            ...post,
            coverImage
        };

        return createSuccessResponse({ post: responsePost });
        
    } catch (error) {
        console.error('Error getting blog post:', error);
        return createErrorResponse('Error getting blog post', 500);
    }
};
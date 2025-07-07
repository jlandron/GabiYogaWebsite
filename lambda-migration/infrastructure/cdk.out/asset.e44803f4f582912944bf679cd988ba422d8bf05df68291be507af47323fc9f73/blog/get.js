const { dynamoUtils, createSuccessResponse, createErrorResponse, logWithContext, isAdminUser } = require('../shared/public-utils');
const { generateCdnUrl } = require('../shared/cdn-utils');
const AWS = require('aws-sdk');
const s3 = new AWS.S3();

exports.handler = async (event, context) => {
    console.log('Event:', JSON.stringify(event, null, 2));
    
    try {
        const idOrSlug = event.pathParameters?.id;
        if (!idOrSlug) {
            return createErrorResponse('Blog ID or slug is required', 400);
        }

        // Try to get the post by ID first
        let post = await dynamoUtils.getItem(process.env.BLOG_POSTS_TABLE, { id: idOrSlug });

        // If not found by ID, try the slug index
        if (!post) {
            const posts = await dynamoUtils.queryItems(
                process.env.BLOG_POSTS_TABLE,
                'SlugIndex',
                '#slug = :slug',
                { ':slug': idOrSlug },
                { '#slug': 'slug' }
            );
            post = posts?.[0];
        }

        // Check if we found a post
        if (!post) {
            return createErrorResponse('Blog post not found', 404);
        }

        // Check if this is an admin request
        const isAdmin = await isAdminUser(event.headers);

        // Only return published posts to non-admin users
        if (post.status !== 'published' && !isAdmin) {
            return createErrorResponse('Blog post not found', 404);
        }

        // Generate URL for cover image (CDN if available, otherwise S3 presigned URL)
        let coverImage = null;
        if (post.coverImage) {
            try {
                // Clean the S3 key (remove leading slash if present)
                const s3Key = post.coverImage.startsWith('/') ? post.coverImage.substring(1) : post.coverImage;
                
                // Try to generate CDN URL first
                const cdnUrl = generateCdnUrl(s3Key, 'gallery', { 
                    requestId: context.awsRequestId, 
                    blogId: post.id 
                });
                
                let imageUrl;
                
                if (cdnUrl) {
                    // Use CDN URL if available
                    imageUrl = cdnUrl;
                    logWithContext('debug', 'Using CDN URL for blog post cover image', {
                        requestId: context.awsRequestId,
                        blogId: post.id,
                        cdnUrl
                    });
                } else {
                    // Fall back to presigned URL
                    imageUrl = await s3.getSignedUrlPromise('getObject', {
                        Bucket: process.env.ASSETS_BUCKET,
                        Key: s3Key,
                        Expires: 3600 // 1 hour
                    });
                    logWithContext('debug', 'Using presigned S3 URL for blog post cover image', {
                        requestId: context.awsRequestId,
                        blogId: post.id
                    });
                }
                
                coverImage = {
                    s3Key: s3Key,
                    url: imageUrl
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

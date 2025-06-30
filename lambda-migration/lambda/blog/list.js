/**
 * Blog List Lambda Function
 * Handles retrieving published blog posts with pagination
 */

const { 
  createSuccessResponse, 
  createErrorResponse,
  logWithContext,
  dynamoUtils
} = require('../shared/public-utils');

exports.handler = async (event, context) => {
  // Set up request ID for tracking
  const requestId = context.awsRequestId;
  
  try {
    logWithContext('info', 'Blog list request received', { requestId });

    // Handle CORS preflight
    if (event.httpMethod === 'OPTIONS') {
      return createSuccessResponse({}, 200);
    }

    // Parse query parameters
    const queryParams = event.queryStringParameters || {};
    const limit = Math.min(parseInt(queryParams.limit) || 10, 50); // Max 50 posts per request
    const page = Math.max(parseInt(queryParams.page) || 1, 1);
    const category = queryParams.category;
    const publishedOnly = queryParams.published !== 'false'; // Default to published only

    logWithContext('info', 'Processing blog list request', { 
      requestId, 
      limit,
      page,
      category,
      publishedOnly
    });

    // Calculate offset for pagination
    const startKey = page > 1 ? { 
      id: queryParams.lastEvaluatedKey 
    } : undefined;

    let posts = [];
    let lastEvaluatedKey = null;

    if (category) {
      // Query by category using GSI
      const result = await dynamoUtils.queryItems(
        process.env.BLOG_POSTS_TABLE,
        'CategoryIndex',
        'category = :category AND publishedAt < :now',
        {
          ':category': category,
          ':now': new Date().toISOString()
        }
      );
      posts = result || [];
    } else {
      // Scan all published posts
      try {
        const AWS = require('aws-sdk');
        const dynamoDb = new AWS.DynamoDB.DocumentClient();
        
        const scanParams = {
          TableName: process.env.BLOG_POSTS_TABLE,
          FilterExpression: publishedOnly ? 
            '#status = :published AND publishedAt < :now' : 
            'attribute_exists(id)',
          ExpressionAttributeNames: publishedOnly ? {
            '#status': 'status'
          } : undefined,
          ExpressionAttributeValues: publishedOnly ? {
            ':published': 'published',
            ':now': new Date().toISOString()
          } : undefined,
          Limit: limit,
          ExclusiveStartKey: startKey
        };

        const result = await dynamoDb.scan(scanParams).promise();
        posts = result.Items || [];
        lastEvaluatedKey = result.LastEvaluatedKey;
      } catch (scanError) {
        logWithContext('error', 'Error scanning blog posts', { 
          requestId, 
          error: scanError.message 
        });
        throw scanError;
      }
    }

    // Sort posts by publishedAt descending
    posts.sort((a, b) => new Date(b.publishedAt || b.createdAt) - new Date(a.publishedAt || a.createdAt));

    // Apply pagination after sorting
    const startIndex = (page - 1) * limit;
    const paginatedPosts = posts.slice(startIndex, startIndex + limit);

    // Transform posts for response (remove sensitive data)
    const transformedPosts = paginatedPosts.map(post => ({
      id: post.id,
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt || (post.content ? post.content.substring(0, 200) + '...' : ''),
      coverImage: post.coverImage,
      category: post.category || 'General',
      tags: post.tags || [],
      publishedAt: post.publishedAt,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
      author: post.author ? {
        id: post.author.id,
        firstName: post.author.firstName,
        lastName: post.author.lastName
      } : {
        firstName: 'Gabi',
        lastName: 'Yoga'
      },
      readTime: calculateReadTime(post.content || ''),
      status: publishedOnly ? 'published' : post.status
    }));

    // Calculate pagination info
    const totalPosts = posts.length;
    const totalPages = Math.ceil(totalPosts / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    logWithContext('info', 'Blog list request successful', { 
      requestId, 
      postsReturned: transformedPosts.length,
      totalPosts,
      page
    });

    return createSuccessResponse({
      posts: transformedPosts,
      pagination: {
        currentPage: page,
        totalPages,
        totalPosts,
        postsPerPage: limit,
        hasNextPage,
        hasPrevPage,
        nextPage: hasNextPage ? page + 1 : null,
        prevPage: hasPrevPage ? page - 1 : null,
        lastEvaluatedKey: lastEvaluatedKey?.id || null
      },
      filters: {
        category,
        publishedOnly
      }
    });

  } catch (error) {
    logWithContext('error', 'Blog list error', { 
      requestId, 
      error: error.message,
      stack: error.stack 
    });

    // Handle specific DynamoDB errors
    if (error.code === 'ResourceNotFoundException') {
      return createErrorResponse('Blog service temporarily unavailable', 503);
    }

    return createErrorResponse('An error occurred while fetching blog posts', 500);
  }
};

/**
 * Calculate estimated read time for a blog post
 */
function calculateReadTime(content) {
  if (!content) return 1;
  
  // Remove HTML tags and count words
  const textContent = content.replace(/<[^>]*>/g, '');
  const wordCount = textContent.split(/\s+/).filter(word => word.length > 0).length;
  
  // Average reading speed is 200-250 words per minute, we'll use 225
  const readTimeMinutes = Math.ceil(wordCount / 225);
  
  return Math.max(readTimeMinutes, 1); // Minimum 1 minute
}

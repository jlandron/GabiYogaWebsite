/**
 * Admin Newsletter API
 * Handles sending newsletters to subscribers
 */

const express = require('express');
const router = express.Router();
const { sendSuccess, sendError, asyncHandler } = require('../utils/api-response');
const { authenticateToken } = require('./auth');
const { NewsletterOperations } = require('../database/data-access');
const emailService = require('../utils/email-service');
const logger = require('../utils/logger');
const { BlogOperations } = require('../api/blog'); // Import BlogOperations directly

// Ensure only admin users can access these endpoints
router.use(authenticateToken);
router.use((req, res, next) => {
    if (req.user.role !== 'admin') {
        return sendError(res, 'Only administrators can manage newsletters', null, 403);
    }
    next();
});

/**
 * GET /api/admin/newsletter-subscribers/active-count
 * Count active newsletter subscribers
 */
router.get('/newsletter-subscribers/active-count', asyncHandler(async (req, res) => {
    try {
        const subscribers = await NewsletterOperations.getAllSubscribers();
        const activeSubscribers = subscribers.filter(sub => sub.active);
        
        return sendSuccess(res, { 
            success: true, 
            count: activeSubscribers.length 
        });
    } catch (error) {
        logger.error('Error counting active subscribers:', error);
        return sendError(res, 'Failed to count active subscribers', 500);
    }
}));

/**
 * POST /api/admin/send-newsletter
 * Send a blog post as a newsletter to all active subscribers
 */
router.post('/send-newsletter', asyncHandler(async (req, res) => {
    // Check body for blogPostId in various formats
    const { blogPostId } = req.body;
    
    // Debug request body
    logger.debug('Newsletter send request body:', { 
        body: req.body,
        blogPostId: blogPostId,
        bodyType: typeof req.body,
        bodyKeys: Object.keys(req.body)
    });
    
    if (!blogPostId) {
        return sendError(res, 'Blog post ID is required', 400);
    }
    
    try {
        // Normalize the blog post ID to ensure it's treated as a proper value
        const normalizedId = parseInt(blogPostId) || blogPostId;
        
        logger.debug('Fetching blog post for newsletter:', { 
            originalId: blogPostId,
            normalizedId,
            url: `${req.protocol}://${req.get('host')}/api/blog/posts/${normalizedId}`
        });
        
        // Get blog post directly using BlogOperations
        logger.debug('Using BlogOperations.getPostById directly', { normalizedId });
        const post = await BlogOperations.getPostById(normalizedId);
        
        if (!post) {
            throw new Error('Blog post not found');
        }
        
        // Get active subscribers
        const subscribers = await NewsletterOperations.getAllSubscribers();
        const activeSubscribers = subscribers.filter(sub => sub.active);
        
        if (activeSubscribers.length === 0) {
            return sendSuccess(res, { 
                success: true, 
                sentCount: 0,
                message: 'No active subscribers found'
            });
        }
        
        // Format the post date
        const postDate = new Date(post.publishedAt || post.createdAt).toLocaleDateString('en-US', {
            year: 'numeric', 
            month: 'long', 
            day: 'numeric'
        });
        
        // Create email content
        const blogUrl = `${req.protocol}://${req.get('host')}/blog.html?post=${post.slug}`;
        
        // Track email sending results
        let sentCount = 0;
        let errorCount = 0;
        const errors = [];
        
        // Send emails to each subscriber
        for (const subscriber of activeSubscribers) {
            try {
                // Create a personalized unsubscribe link for each subscriber
                const unsubscribeUrl = `${req.protocol}://${req.get('host')}/api/newsletter/unsubscribe?email=${encodeURIComponent(subscriber.email)}`;
                
                // Send newsletter email
                await emailService.sendEmail({
                    to: subscriber.email,
                    subject: `Gabi Yoga: ${post.title}`,
                    htmlBody: createNewsletterEmailHtml(post, postDate, blogUrl, unsubscribeUrl),
                    textBody: createNewsletterEmailText(post, postDate, blogUrl, unsubscribeUrl)
                });
                
                sentCount++;
            } catch (emailError) {
                logger.error(`Error sending newsletter to ${subscriber.email}:`, emailError);
                errorCount++;
                errors.push({
                    email: subscriber.email,
                    error: emailError.message
                });
            }
        }
        
        return sendSuccess(res, {
            success: true,
            sentCount,
            errorCount,
            errors: errors.length > 0 ? errors : undefined,
            message: `Newsletter sent to ${sentCount} subscribers` + 
                     (errorCount > 0 ? ` (${errorCount} failures)` : '')
        });
        
    } catch (error) {
        logger.error('Error sending newsletter:', error);
        return sendError(res, `Failed to send newsletter: ${error.message}`, 500);
    }
}));

/**
 * Create HTML email content for newsletter
 */
function createNewsletterEmailHtml(post, postDate, blogUrl, unsubscribeUrl) {
    return `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #7fa99b; color: white; padding: 20px; text-align: center; border-radius: 4px 4px 0 0;">
                <h1 style="margin: 0;">Gabi Yoga Newsletter</h1>
            </div>
            
            <div style="padding: 20px; background-color: #ffffff;">
                <h2 style="color: #557a95;">${post.title}</h2>
                <p style="font-style: italic; color: #666;">By ${post.author || 'Gabi'} - ${postDate}</p>
                
                ${post.coverImage ? `
                <div style="margin: 20px 0;">
                    <img src="${post.coverImage.url}" alt="${post.coverImage.alt || 'Blog post image'}" style="max-width: 100%; height: auto; border-radius: 4px;">
                </div>` : ''}
                
                <div style="margin: 20px 0; line-height: 1.6;">
                    ${post.excerpt || 'Check out our latest blog post!'}
                </div>
                
                <div style="margin: 30px 0; text-align: center;">
                    <a href="${blogUrl}" style="background-color: #7fa99b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">
                        Read Full Article
                    </a>
                </div>
            </div>
            
            <div style="background-color: #f5f5f5; padding: 20px; text-align: center; font-size: 14px; color: #666; border-radius: 0 0 4px 4px;">
                <p>Thank you for subscribing to Gabi Yoga newsletter!</p>
                <p>
                    <a href="${unsubscribeUrl}" style="color: #666; text-decoration: underline;">
                        Unsubscribe
                    </a>
                </p>
            </div>
        </div>
    `;
}

/**
 * Create plain text email content for newsletter
 */
function createNewsletterEmailText(post, postDate, blogUrl, unsubscribeUrl) {
    return `
GABI YOGA NEWSLETTER

${post.title}

By ${post.author || 'Gabi'} - ${postDate}

${post.excerpt || 'Check out our latest blog post!'}

Read the full article at: ${blogUrl}

---

Thank you for subscribing to Gabi Yoga newsletter!

To unsubscribe, visit: ${unsubscribeUrl}
    `;
}

module.exports = router;

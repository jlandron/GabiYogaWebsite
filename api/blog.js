/**
 * Blog API
 * Handles all blog-related API endpoints
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { sendSuccess: APISuccess, sendError: APIError, notFound: APINotFound } = require('../utils/api-response');
const { authenticateToken } = require('./auth');
const { asyncHandler } = require('../utils/api-response');
const { query } = require('../database/db-config'); // Use the centralized database config
const logger = require('../utils/logger');
const imageStorage = require('../utils/image-storage');

// Get the DB_TYPE from process.env or based on NODE_ENV
const NODE_ENV = process.env.NODE_ENV || 'development';
const DEFAULT_DB_TYPE = NODE_ENV === 'production' ? 'mysql' : 'sqlite';
const DB_TYPE = process.env.DB_TYPE || DEFAULT_DB_TYPE;

// Blog tables are now initialized in database/schema-blog.js during server startup
console.log('Blog API module loaded');

// Helper functions for blog operations
const BlogOperations = {
  // Get all blog posts with pagination
  getAllPosts: async (page = 1, limit = 10, filters = {}) => {
    try {
      // Build WHERE clause
      const conditions = [];
      const params = [];
      
      if (filters.published !== undefined) {
        conditions.push('published = ?');
        params.push(filters.published ? 1 : 0);
      }
      
      if (filters.search) {
        conditions.push('(title LIKE ? OR content LIKE ?)');
        params.push(`%${filters.search}%`, `%${filters.search}%`);
      }
      
      if (filters.tag) {
        conditions.push(`id IN (
          SELECT post_id FROM blog_post_tags 
          JOIN blog_tags ON blog_tags.id = blog_post_tags.tag_id 
          WHERE blog_tags.tag = ?
        )`);
        params.push(filters.tag);
      }
      
      const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
      const offset = (page - 1) * limit;
      
      // Count total posts for pagination
      const countResult = await query(`SELECT COUNT(*) as total FROM blog_posts ${whereClause}`, params);
      const total = countResult[0].total;
      const pages = Math.ceil(total / limit);
      
      // Get posts with pagination
      const sql = `
        SELECT * FROM blog_posts 
        ${whereClause}
        ORDER BY 
          CASE WHEN published_at IS NOT NULL THEN published_at ELSE created_at END DESC
        LIMIT ? OFFSET ?
      `;
      
      const posts = await query(sql, [...params, limit, offset]);
      
      // Get tags for each post
      const postsWithTags = await Promise.all(posts.map(async post => {
        const tags = await BlogOperations.getPostTags(post.id);
        const images = await BlogOperations.getPostImages(post.id);
        
        return {
          _id: post.id,
          title: post.title,
          slug: post.slug,
          content: post.content,
          excerpt: post.excerpt,
          author: post.author,
          published: Boolean(post.published),
          publishedAt: post.published_at,
          createdAt: post.created_at,
          updatedAt: post.updated_at,
          coverImage: post.cover_image_url ? {
            url: post.cover_image_url,
            alt: post.cover_image_alt || ''
          } : null,
          tags,
          images
        };
      }));
      
      return {
        posts: postsWithTags,
        pagination: {
          total,
          page,
          limit,
          pages
        }
      };
    } catch (error) {
      console.error('Error getting blog posts:', error);
      throw error;
    }
  },
  
  // Get a single post by ID
  getPostById: async (id) => {
    try {
      const posts = await query('SELECT * FROM blog_posts WHERE id = ?', [id]);
      if (!posts.length) return null;
      
      const post = posts[0];
      const tags = await BlogOperations.getPostTags(post.id);
      const images = await BlogOperations.getPostImages(post.id);
      
      return {
        _id: post.id,
        title: post.title,
        slug: post.slug,
        content: post.content,
        excerpt: post.excerpt,
        author: post.author,
        published: Boolean(post.published),
        publishedAt: post.published_at,
        createdAt: post.created_at,
        updatedAt: post.updated_at,
        coverImage: post.cover_image_url ? {
          url: post.cover_image_url,
          alt: post.cover_image_alt || ''
        } : null,
        tags,
        images
      };
    } catch (error) {
      console.error('Error getting post by ID:', error);
      throw error;
    }
  },
  
  // Get a post by slug
  getPostBySlug: async (slug) => {
    try {
      const posts = await query('SELECT * FROM blog_posts WHERE slug = ?', [slug]);
      if (!posts.length) return null;
      
      const post = posts[0];
      const tags = await BlogOperations.getPostTags(post.id);
      const images = await BlogOperations.getPostImages(post.id);
      
      return {
        _id: post.id,
        title: post.title,
        slug: post.slug,
        content: post.content,
        excerpt: post.excerpt,
        author: post.author,
        published: Boolean(post.published),
        publishedAt: post.published_at,
        createdAt: post.created_at,
        updatedAt: post.updated_at,
        coverImage: post.cover_image_url ? {
          url: post.cover_image_url,
          alt: post.cover_image_alt || ''
        } : null,
        tags,
        images
      };
    } catch (error) {
      console.error('Error getting post by slug:', error);
      throw error;
    }
  },
  
  // Create a new blog post
  createPost: async (postData) => {
    try {
      const { 
        title, slug, content, excerpt, author, tags, published, 
        coverImage, images 
      } = postData;
      
      const publishedAt = published ? new Date().toISOString() : null;
      
      // Insert post
      const result = await query(`
        INSERT INTO blog_posts (
          title, slug, content, excerpt, author, published, published_at,
          cover_image_url, cover_image_alt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        title, 
        slug, 
        content, 
        excerpt || null, 
        author || 'Gabi', 
        published ? 1 : 0, 
        publishedAt,
        coverImage?.url || null,
        coverImage?.alt || null
      ]);
      
      const postId = result.lastID;
      
      // Add tags if present
      if (tags && tags.length) {
        await BlogOperations.addTagsToPost(postId, tags);
      }
      
      // Add images if present
      if (images && images.length) {
        await BlogOperations.addImagesToPost(postId, images);
      }
      
      // Get the complete post with tags and images
      return await BlogOperations.getPostById(postId);
    } catch (error) {
      console.error('Error creating blog post:', error);
      throw error;
    }
  },
  
  // Update a blog post
  updatePost: async (postId, postData) => {
    try {
      const existingPost = await BlogOperations.getPostById(postId);
      if (!existingPost) {
        throw new Error('Post not found');
      }
      
      const { 
        title, slug, content, excerpt, author, tags, published, 
        coverImage, images 
      } = postData;
      
      // Check if published status changed
      const wasPublished = existingPost.published;
      const isNowPublished = published !== undefined ? published : wasPublished;
      
      // Only set published_at if going from unpublished to published
      const publishedAt = (!wasPublished && isNowPublished) ? 
        new Date().toISOString() : existingPost.publishedAt;
      
      // Update post
      const updateFields = [];
      const updateValues = [];
      
      if (title !== undefined) {
        updateFields.push('title = ?');
        updateValues.push(title);
      }
      
      if (slug !== undefined) {
        updateFields.push('slug = ?');
        updateValues.push(slug);
      }
      
      if (content !== undefined) {
        updateFields.push('content = ?');
        updateValues.push(content);
      }
      
      if (excerpt !== undefined) {
        updateFields.push('excerpt = ?');
        updateValues.push(excerpt || null);
      }
      
      if (author !== undefined) {
        updateFields.push('author = ?');
        updateValues.push(author);
      }
      
      if (published !== undefined) {
        updateFields.push('published = ?');
        updateValues.push(published ? 1 : 0);
      }
      
      if (publishedAt !== existingPost.publishedAt) {
        updateFields.push('published_at = ?');
        updateValues.push(publishedAt);
      }
      
      if (coverImage !== undefined) {
        updateFields.push('cover_image_url = ?');
        updateFields.push('cover_image_alt = ?');
        updateValues.push(coverImage?.url || null);
        updateValues.push(coverImage?.alt || null);
      }
      
      updateFields.push('updated_at = CURRENT_TIMESTAMP');
      
      if (updateFields.length > 0) {
        const updateSql = `UPDATE blog_posts SET ${updateFields.join(', ')} WHERE id = ?`;
        await query(updateSql, [...updateValues, postId]);
        
        // Update tags if provided
        if (tags !== undefined) {
          await BlogOperations.updatePostTags(postId, tags);
        }
        
        // Update images if provided
        if (images !== undefined) {
          await BlogOperations.updatePostImages(postId, images);
        }
        
        // Get the updated post
        return await BlogOperations.getPostById(postId);
      } else {
        return existingPost;
      }
    } catch (error) {
      console.error('Error updating blog post:', error);
      throw error;
    }
  },
  
  // Delete a blog post
  deletePost: async (postId) => {
    try {
      const result = await query('DELETE FROM blog_posts WHERE id = ?', [postId]);
      return result.changes > 0;
    } catch (error) {
      console.error('Error deleting blog post:', error);
      throw error;
    }
  },
  
  // Get tags for a post
  getPostTags: async (postId) => {
    try {
      const rows = await query(`
        SELECT bt.tag FROM blog_tags bt
        JOIN blog_post_tags bpt ON bt.id = bpt.tag_id
        WHERE bpt.post_id = ?
      `, [postId]);
      return rows.map(row => row.tag);
    } catch (error) {
      console.error('Error getting post tags:', error);
      throw error;
    }
  },
  
  // Add tags to a post
  addTagsToPost: async (postId, tags) => {
    try {
      if (!tags.length) return;
      
      for (const tag of tags) {
        // Insert or get tag ID (using database-specific syntax)
        if (DB_TYPE === 'mysql') {
          await query('INSERT IGNORE INTO blog_tags (tag) VALUES (?)', [tag]);
        } else {
          await query('INSERT OR IGNORE INTO blog_tags (tag) VALUES (?)', [tag]);
        }
        
        // Get tag ID
        const rows = await query('SELECT id FROM blog_tags WHERE tag = ?', [tag]);
        const tagId = rows[0].id;
        
        // Link tag to post
        if (DB_TYPE === 'mysql') {
          await query('INSERT IGNORE INTO blog_post_tags (post_id, tag_id) VALUES (?, ?)', 
            [postId, tagId]);
        } else {
          await query('INSERT OR IGNORE INTO blog_post_tags (post_id, tag_id) VALUES (?, ?)', 
            [postId, tagId]);
        }
      }
    } catch (error) {
      console.error('Error adding tags to post:', error);
      throw error;
    }
  },
  
  // Update post tags (remove all existing and add new ones)
  updatePostTags: async (postId, tags) => {
    try {
      // Delete existing tags
      await query('DELETE FROM blog_post_tags WHERE post_id = ?', [postId]);
      
      // Add new tags
      if (tags && tags.length) {
        await BlogOperations.addTagsToPost(postId, tags);
      }
    } catch (error) {
      console.error('Error updating post tags:', error);
      throw error;
    }
  },
  
  // Get images for a post
  getPostImages: async (postId) => {
    try {
      const rows = await query('SELECT url, alt, caption FROM blog_post_images WHERE post_id = ?', [postId]);
      return rows;
    } catch (error) {
      console.error('Error getting post images:', error);
      throw error;
    }
  },
  
  // Add images to a post
  addImagesToPost: async (postId, images) => {
    try {
      if (!images.length) return;
      
      for (const image of images) {
        await query(`
          INSERT INTO blog_post_images (post_id, url, alt, caption)
          VALUES (?, ?, ?, ?)
        `, [postId, image.url, image.alt || null, image.caption || null]);
      }
    } catch (error) {
      console.error('Error adding images to post:', error);
      throw error;
    }
  },
  
  // Update post images (remove existing and add new ones)
  updatePostImages: async (postId, images) => {
    try {
      // Delete existing images
      await query('DELETE FROM blog_post_images WHERE post_id = ?', [postId]);
      
      // Add new images
      if (images && images.length) {
        await BlogOperations.addImagesToPost(postId, images);
      }
    } catch (error) {
      console.error('Error updating post images:', error);
      throw error;
    }
  },
  
  // Get all tags with post counts
  getAllTags: async () => {
    try {
      const rows = await query(`
        SELECT bt.tag, COUNT(bpt.post_id) AS count 
        FROM blog_tags bt
        JOIN blog_post_tags bpt ON bt.id = bpt.tag_id
        JOIN blog_posts bp ON bpt.post_id = bp.id
        WHERE bp.published = 1
        GROUP BY bt.tag
        ORDER BY count DESC
      `);
      return rows;
    } catch (error) {
      console.error('Error getting all tags:', error);
      throw error;
    }
  }
};

// Set up multer for memory storage (to process with imageStorage)
const upload = multer({ 
    storage: multer.memoryStorage(),
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Not an image! Please upload an image file.'), false);
        }
    },
    limits: {
        fileSize: 8 * 1024 * 1024 // 8 MB limit (same as gallery)
    }
});

/**
 * GET all blog posts
 * Public route
 */
router.get('/posts', asyncHandler(async (req, res) => {
    // Query parameters for filtering
    const { tag, search, published, limit = 10, page = 1 } = req.query;
    
    // Build filters object
    const filters = {};
    
    if (published !== undefined) {
        filters.published = published === 'true';
    }
    
    if (tag) {
        filters.tag = tag;
    }
    
    if (search) {
        filters.search = search;
    }
    
    // Get posts with pagination
    const result = await BlogOperations.getAllPosts(
        parseInt(page),
        parseInt(limit),
        filters
    );
    
    return APISuccess(res, result);
}));

/**
 * GET a blog post by slug
 * Public route
 */
router.get('/posts/slug/:slug', asyncHandler(async (req, res) => {
    const post = await BlogOperations.getPostBySlug(req.params.slug);
    
    if (!post) {
        return APIError(res, 'Blog post not found', null, 404);
    }
    
    // If the post is not published, only allow access to admins
    if (!post.published && (!req.user || req.user.role !== 'admin')) {
        return APIError(res, 'This post is not published yet', null, 403);
    }
    
    return APISuccess(res, { post });
}));

/**
 * GET a single blog post by ID
 * Public route
 */
router.get('/posts/:id', asyncHandler(async (req, res) => {
    const post = await BlogOperations.getPostById(req.params.id);
    
    if (!post) {
        return APIError(res, 'Blog post not found', null, 404);
    }
    
    return APISuccess(res, { post });
}));

/**
 * POST a new blog post
 * Admin only route
 */
router.post('/posts', authenticateToken, asyncHandler(async (req, res) => {
    // Check if the user is an admin
    if (req.user.role !== 'admin') {
        return APIError(res, 'Only administrators can create blog posts', null, 403);
    }
    
    const { title, slug, content, excerpt, author, tags, published, coverImage, images } = req.body;
    
    // Validate required fields
    if (!title || !content) {
        return APIError(res, 'Title and content are required', null, 400);
    }
    
    // Generate slug if not provided
    const finalSlug = slug || title.toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();
    
    try {
        // Check if slug is unique
        const existingPost = await BlogOperations.getPostBySlug(finalSlug);
        if (existingPost) {
            return APIError(res, 'A post with this slug already exists', null, 409);
        }
        
        // Create new blog post
        const post = await BlogOperations.createPost({
            title,
            slug: finalSlug,
            content,
            excerpt,
            author: author || 'Gabi',
            tags: tags || [],
            published: published || false,
            coverImage,
            images: images || []
        });
        
        return APISuccess(res, { post }, 'Blog post created successfully', 201);
    } catch (error) {
        console.error('Error creating blog post:', error);
        return APIError(res, error.message);
    }
}));

/**
 * PUT update an existing blog post
 * Admin only route
 */
router.put('/posts/:id', authenticateToken, asyncHandler(async (req, res) => {
    // Check if the user is an admin
    if (req.user.role !== 'admin') {
        return APIError(res, 'Only administrators can update blog posts', null, 403);
    }
    
    const { title, slug, content, excerpt, author, tags, published, coverImage, images } = req.body;
    
    try {
        // Find post
        const existingPost = await BlogOperations.getPostById(req.params.id);
        
        if (!existingPost) {
            return APIError(res, 'Blog post not found', null, 404);
        }
        
        // Check if slug is unique (if changed)
        if (slug && slug !== existingPost.slug) {
            const postWithSlug = await BlogOperations.getPostBySlug(slug);
            if (postWithSlug) {
                return APIError(res, 'A post with this slug already exists', null, 409);
            }
        }
        
        // Update post
        const updatedPost = await BlogOperations.updatePost(req.params.id, {
            title, slug, content, excerpt, author, tags, published, coverImage, images
        });
        
        return APISuccess(res, { post: updatedPost });
    } catch (error) {
        console.error('Error updating blog post:', error);
        return APIError(res, error.message);
    }
}));

/**
 * DELETE a blog post
 * Admin only route
 */
router.delete('/posts/:id', authenticateToken, asyncHandler(async (req, res) => {
    // Check if the user is an admin
    if (req.user.role !== 'admin') {
        return APIError(res, 'Only administrators can delete blog posts', null, 403);
    }
    
    try {
        // Check if post exists
        const post = await BlogOperations.getPostById(req.params.id);
        
        if (!post) {
            return APIError(res, 'Blog post not found', null, 404);
        }
        
        // Delete post
        const success = await BlogOperations.deletePost(req.params.id);
        
        if (success) {
            return APISuccess(res, { message: 'Blog post deleted successfully' });
        } else {
            return APIError(res, 'Failed to delete blog post');
        }
    } catch (error) {
        console.error('Error deleting blog post:', error);
        return APIError(res, error.message);
    }
}));

/**
 * GET blog tags
 * Public route
 */
router.get('/tags', asyncHandler(async (req, res) => {
    const tags = await BlogOperations.getAllTags();
    
    return APISuccess(res, { tags });
}));

/**
 * POST upload a blog image using unified gallery storage
 * Admin only route
 */
router.post('/images/upload', authenticateToken, upload.single('image'), asyncHandler(async (req, res) => {
    // Check if the user is an admin
    if (req.user.role !== 'admin') {
        return APIError(res, 'Only administrators can upload blog images', null, 403);
    }
    
    if (!req.file) {
        return APIError(res, 'No image file provided', null, 400);
    }
    
    try {
        // Validate file size
        const maxSize = 8 * 1024 * 1024; // 8MB max (same as gallery)
        if (req.file.size > maxSize) {
            return APIError(res, 'Image size exceeds the maximum allowed size of 8MB', null, 400);
        }
        
        // Create filename from original name
        const originalFilename = req.file.originalname;
        const sanitizedFilename = originalFilename.toLowerCase().replace(/[^a-z0-9.-]/gi, '-');
        
        // Store the image using unified gallery storage
        const imageInfo = await imageStorage.storeImage(
            req.file.buffer,
            sanitizedFilename,
            req.file.mimetype
        );
        
        logger.debug('Blog image stored successfully:', { 
            filePath: imageInfo.filePath, 
            url: imageInfo.url,
            originalName: originalFilename 
        });
        
        return APISuccess(res, {
            url: imageInfo.url,
            filename: sanitizedFilename,
            mimetype: req.file.mimetype,
            size: req.file.size,
            filePath: imageInfo.filePath
        });
        
    } catch (error) {
        logger.error('Error uploading blog image:', { error: error.message, stack: error.stack });
        return APIError(res, 'Failed to upload image. Please try again.', null, 500);
    }
}));

module.exports = router;

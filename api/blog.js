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
const sqlite3 = require('sqlite3').verbose();

// Database file path - match the path in db-config.js
const dbPath = path.join(__dirname, '../data/yoga_dev.sqlite');

// Initialize database connection
const db = new sqlite3.Database(dbPath);

// Blog table creation if not exists
db.serialize(() => {
  // Create blog_posts table
  db.run(`CREATE TABLE IF NOT EXISTS blog_posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    content TEXT NOT NULL,
    excerpt TEXT,
    author TEXT DEFAULT 'Gabi',
    published BOOLEAN DEFAULT FALSE,
    published_at TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    cover_image_url TEXT,
    cover_image_alt TEXT
  )`);
  
  // Create blog_post_tags table for many-to-many relationship
  db.run(`CREATE TABLE IF NOT EXISTS blog_tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tag TEXT UNIQUE NOT NULL
  )`);
  
  // Create blog_post_tags join table
  db.run(`CREATE TABLE IF NOT EXISTS blog_post_tags (
    post_id INTEGER,
    tag_id INTEGER,
    PRIMARY KEY (post_id, tag_id),
    FOREIGN KEY (post_id) REFERENCES blog_posts(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES blog_tags(id) ON DELETE CASCADE
  )`);
  
  // Create blog_post_images table
  db.run(`CREATE TABLE IF NOT EXISTS blog_post_images (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id INTEGER NOT NULL,
    url TEXT NOT NULL,
    alt TEXT,
    caption TEXT,
    FOREIGN KEY (post_id) REFERENCES blog_posts(id) ON DELETE CASCADE
  )`);
});

// Helper functions for blog operations
const BlogOperations = {
  // Get all blog posts with pagination
  getAllPosts: (page = 1, limit = 10, filters = {}) => {
    return new Promise((resolve, reject) => {
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
      db.get(`SELECT COUNT(*) as total FROM blog_posts ${whereClause}`, params, (err, result) => {
        if (err) return reject(err);
        
        const total = result.total;
        const pages = Math.ceil(total / limit);
        
        // Get posts with pagination
        const sql = `
          SELECT * FROM blog_posts 
          ${whereClause}
          ORDER BY 
            CASE WHEN published_at IS NOT NULL THEN published_at ELSE created_at END DESC
          LIMIT ? OFFSET ?
        `;
        
        db.all(sql, [...params, limit, offset], async (err, posts) => {
          if (err) return reject(err);
          
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
          
          resolve({
            posts: postsWithTags,
            pagination: {
              total,
              page,
              limit,
              pages
            }
          });
        });
      });
    });
  },
  
  // Get a single post by ID
  getPostById: (id) => {
    return new Promise(async (resolve, reject) => {
      db.get('SELECT * FROM blog_posts WHERE id = ?', [id], async (err, post) => {
        if (err) return reject(err);
        if (!post) return resolve(null);
        
        const tags = await BlogOperations.getPostTags(post.id);
        const images = await BlogOperations.getPostImages(post.id);
        
        resolve({
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
        });
      });
    });
  },
  
  // Get a post by slug
  getPostBySlug: (slug) => {
    return new Promise(async (resolve, reject) => {
      db.get('SELECT * FROM blog_posts WHERE slug = ?', [slug], async (err, post) => {
        if (err) return reject(err);
        if (!post) return resolve(null);
        
        const tags = await BlogOperations.getPostTags(post.id);
        const images = await BlogOperations.getPostImages(post.id);
        
        resolve({
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
        });
      });
    });
  },
  
  // Create a new blog post
  createPost: (postData) => {
    return new Promise(async (resolve, reject) => {
      const { 
        title, slug, content, excerpt, author, tags, published, 
        coverImage, images 
      } = postData;
      
      const publishedAt = published ? new Date().toISOString() : null;
      
      try {
        // Begin transaction
        db.serialize(() => {
          db.run('BEGIN TRANSACTION');
          
          // Insert post
          db.run(`
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
          ], function(err) {
            if (err) {
              db.run('ROLLBACK');
              return reject(err);
            }
            
            const postId = this.lastID;
            const promises = [];
            
            // Add tags if present
            if (tags && tags.length) {
              promises.push(BlogOperations.addTagsToPost(postId, tags));
            }
            
            // Add images if present
            if (images && images.length) {
              promises.push(BlogOperations.addImagesToPost(postId, images));
            }
            
            Promise.all(promises)
              .then(async () => {
                db.run('COMMIT');
                // Get the complete post with tags and images
                const post = await BlogOperations.getPostById(postId);
                resolve(post);
              })
              .catch(err => {
                db.run('ROLLBACK');
                reject(err);
              });
          });
        });
      } catch (err) {
        reject(err);
      }
    });
  },
  
  // Update a blog post
  updatePost: (postId, postData) => {
    return new Promise(async (resolve, reject) => {
      try {
        const existingPost = await BlogOperations.getPostById(postId);
        if (!existingPost) {
          return reject(new Error('Post not found'));
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
        
        // Begin transaction
        db.serialize(() => {
          db.run('BEGIN TRANSACTION');
          
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
            db.run(updateSql, [...updateValues, postId], function(err) {
              if (err) {
                db.run('ROLLBACK');
                return reject(err);
              }
              
              const promises = [];
              
              // Update tags if provided
              if (tags !== undefined) {
                promises.push(BlogOperations.updatePostTags(postId, tags));
              }
              
              // Update images if provided
              if (images !== undefined) {
                promises.push(BlogOperations.updatePostImages(postId, images));
              }
              
              Promise.all(promises)
                .then(async () => {
                  db.run('COMMIT');
                  // Get the updated post
                  const post = await BlogOperations.getPostById(postId);
                  resolve(post);
                })
                .catch(err => {
                  db.run('ROLLBACK');
                  reject(err);
                });
            });
          } else {
            db.run('ROLLBACK');
            resolve(existingPost);
          }
        });
      } catch (err) {
        reject(err);
      }
    });
  },
  
  // Delete a blog post
  deletePost: (postId) => {
    return new Promise((resolve, reject) => {
      db.run('DELETE FROM blog_posts WHERE id = ?', [postId], function(err) {
        if (err) return reject(err);
        resolve(this.changes > 0);
      });
    });
  },
  
  // Get tags for a post
  getPostTags: (postId) => {
    return new Promise((resolve, reject) => {
      db.all(`
        SELECT bt.tag FROM blog_tags bt
        JOIN blog_post_tags bpt ON bt.id = bpt.tag_id
        WHERE bpt.post_id = ?
      `, [postId], (err, rows) => {
        if (err) return reject(err);
        resolve(rows.map(row => row.tag));
      });
    });
  },
  
  // Add tags to a post
  addTagsToPost: (postId, tags) => {
    return new Promise((resolve, reject) => {
      if (!tags.length) return resolve();
      
      const insertTag = (tag) => {
        return new Promise((resolve, reject) => {
          // Insert or get tag ID
          db.run('INSERT OR IGNORE INTO blog_tags (tag) VALUES (?)', [tag], function(err) {
            if (err) return reject(err);
            
            // Get tag ID
            db.get('SELECT id FROM blog_tags WHERE tag = ?', [tag], (err, row) => {
              if (err) return reject(err);
              
              // Link tag to post
              db.run('INSERT OR IGNORE INTO blog_post_tags (post_id, tag_id) VALUES (?, ?)', 
                [postId, row.id], (err) => {
                if (err) return reject(err);
                resolve();
              });
            });
          });
        });
      };
      
      Promise.all(tags.map(insertTag)).then(resolve).catch(reject);
    });
  },
  
  // Update post tags (remove all existing and add new ones)
  updatePostTags: (postId, tags) => {
    return new Promise((resolve, reject) => {
      // Delete existing tags
      db.run('DELETE FROM blog_post_tags WHERE post_id = ?', [postId], (err) => {
        if (err) return reject(err);
        
        // Add new tags
        if (tags && tags.length) {
          BlogOperations.addTagsToPost(postId, tags).then(resolve).catch(reject);
        } else {
          resolve();
        }
      });
    });
  },
  
  // Get images for a post
  getPostImages: (postId) => {
    return new Promise((resolve, reject) => {
      db.all('SELECT url, alt, caption FROM blog_post_images WHERE post_id = ?', 
        [postId], (err, rows) => {
        if (err) return reject(err);
        resolve(rows);
      });
    });
  },
  
  // Add images to a post
  addImagesToPost: (postId, images) => {
    return new Promise((resolve, reject) => {
      if (!images.length) return resolve();
      
      const insertImage = (image) => {
        return new Promise((resolve, reject) => {
          db.run(`
            INSERT INTO blog_post_images (post_id, url, alt, caption)
            VALUES (?, ?, ?, ?)
          `, [postId, image.url, image.alt || null, image.caption || null], (err) => {
            if (err) return reject(err);
            resolve();
          });
        });
      };
      
      Promise.all(images.map(insertImage)).then(resolve).catch(reject);
    });
  },
  
  // Update post images (remove existing and add new ones)
  updatePostImages: (postId, images) => {
    return new Promise((resolve, reject) => {
      // Delete existing images
      db.run('DELETE FROM blog_post_images WHERE post_id = ?', [postId], (err) => {
        if (err) return reject(err);
        
        // Add new images
        if (images && images.length) {
          BlogOperations.addImagesToPost(postId, images).then(resolve).catch(reject);
        } else {
          resolve();
        }
      });
    });
  },
  
  // Get all tags with post counts
  getAllTags: () => {
    return new Promise((resolve, reject) => {
      db.all(`
        SELECT bt.tag, COUNT(bpt.post_id) AS count 
        FROM blog_tags bt
        JOIN blog_post_tags bpt ON bt.id = bpt.tag_id
        JOIN blog_posts bp ON bpt.post_id = bp.id
        WHERE bp.published = 1
        GROUP BY bt.tag
        ORDER BY count DESC
      `, [], (err, rows) => {
        if (err) return reject(err);
        resolve(rows);
      });
    });
  }
};

// Set up multer for image uploads
const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        const uploadDir = path.join(__dirname, '../uploads/blog');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function(req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, file.fieldname + '-' + uniqueSuffix + ext);
    }
});

// Filter only image files
const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Not an image! Please upload an image file.'), false);
    }
};

const upload = multer({ 
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5 MB limit
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
 * POST upload a blog image
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
    
    // Create the image URL
    const imageUrl = `/uploads/blog/${req.file.filename}`;
    
    return APISuccess(res, {
        url: imageUrl,
        filename: req.file.filename,
        mimetype: req.file.mimetype,
        size: req.file.size
    });
}));

module.exports = router;

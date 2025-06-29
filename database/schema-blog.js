
/**
 * Schema definition for blog tables
 * This file provides functions to initialize and manage blog tables
 */

var dbConfig = require('./db-config');
var query = dbConfig.query;

// Get the DB_TYPE from process.env or based on NODE_ENV
var NODE_ENV = process.env.NODE_ENV || 'development';
var DEFAULT_DB_TYPE = NODE_ENV === 'production' ? 'mysql' : 'sqlite';
var DB_TYPE = process.env.DB_TYPE || DEFAULT_DB_TYPE;

/**
 * Migrate cover_image_url column to cover_image_path
 */
const migrateCoverImageColumns = async () => {
  try {
    console.log('Checking if cover_image_url to cover_image_path migration is needed...');
    
    // Check if cover_image_url column exists
    let urlColumnExists = false;
    let pathColumnExists = false;
    
    if (DB_TYPE === 'sqlite') {
      // For SQLite, check table structure
      const result = await query(`PRAGMA table_info(blog_posts)`);
      if (Array.isArray(result)) {
        urlColumnExists = result.some(column => column.name === 'cover_image_url');
        pathColumnExists = result.some(column => column.name === 'cover_image_path');
      }
    } else {
      // For MySQL, check information_schema
      try {
        const urlResult = await query(`
          SELECT COUNT(*) as count 
          FROM information_schema.columns 
          WHERE table_schema = DATABASE() 
          AND table_name = 'blog_posts'
          AND column_name = 'cover_image_url'
        `);
        urlColumnExists = urlResult && urlResult[0] && urlResult[0].count > 0;
        
        const pathResult = await query(`
          SELECT COUNT(*) as count 
          FROM information_schema.columns 
          WHERE table_schema = DATABASE() 
          AND table_name = 'blog_posts'
          AND column_name = 'cover_image_path'
        `);
        pathColumnExists = pathResult && pathResult[0] && pathResult[0].count > 0;
      } catch (error) {
        console.warn('Error checking column existence:', error.message);
      }
    }
    
    // If we have the old column but not the new one, migrate
    if (urlColumnExists && !pathColumnExists) {
      console.log('Migrating cover_image_url to cover_image_path...');
      
      // Add the new column
      await query(`ALTER TABLE blog_posts ADD COLUMN cover_image_path TEXT`);
      console.log('Added cover_image_path column');
      
      // Copy data from url to path column (extracting file paths from URLs)
      const postsWithImages = await query(`
        SELECT id, cover_image_url 
        FROM blog_posts 
        WHERE cover_image_url IS NOT NULL AND cover_image_url != ''
      `);
      
      console.log(`Found ${postsWithImages.length} posts with cover images to migrate`);
      
      for (const post of postsWithImages) {
        try {
          // Extract file path from URL
          let filePath = null;
          const url = post.cover_image_url;
          
          if (url) {
            // Handle S3 URLs
            if (url.includes('.s3.amazonaws.com/')) {
              const pathMatch = url.match(/\.s3\.amazonaws\.com\/(.+)$/);
              if (pathMatch && pathMatch[1]) {
                filePath = decodeURIComponent(pathMatch[1]);
              }
            }
            // Handle CloudFront URLs
            else if (url.includes('.cloudfront.net/')) {
              const pathMatch = url.match(/\.cloudfront\.net\/(.+)$/);
              if (pathMatch && pathMatch[1]) {
                filePath = decodeURIComponent(pathMatch[1]);
              }
            }
            // Handle local URLs
            else if (url.startsWith('/uploads/')) {
              filePath = url.substring(1); // Remove leading slash
            }
            // Last resort - use filename in gallery directory
            else {
              const filename = url.split('/').pop();
              if (filename) {
                filePath = `gallery/${filename}`;
              }
            }
            
            if (filePath) {
              await query(`
                UPDATE blog_posts 
                SET cover_image_path = ? 
                WHERE id = ?
              `, [filePath, post.id]);
              console.log(`Migrated post ${post.id}: ${filePath}`);
            } else {
              console.warn(`Could not extract file path from URL for post ${post.id}: ${url}`);
            }
          }
        } catch (error) {
          console.error(`Error migrating post ${post.id}:`, error.message);
        }
      }
      
      // Remove the old column
      if (DB_TYPE === 'sqlite') {
        // SQLite doesn't support DROP COLUMN easily, so we'll leave it for now
        console.log('Note: cover_image_url column left in place (SQLite limitation)');
      } else {
        // MySQL can drop the column
        try {
          await query(`ALTER TABLE blog_posts DROP COLUMN cover_image_url`);
          console.log('Removed old cover_image_url column');
        } catch (error) {
          console.warn('Could not remove cover_image_url column:', error.message);
        }
      }
      
      console.log('Cover image column migration completed');
    } else if (!urlColumnExists && pathColumnExists) {
      console.log('Cover image migration already completed');
    } else if (!urlColumnExists && !pathColumnExists) {
      console.log('No cover image columns found - new installation');
    } else {
      console.log('Both cover_image_url and cover_image_path exist - migration may be in progress');
    }
  } catch (error) {
    console.error('Error during cover image column migration:', error);
    // Don't throw - let the app continue even if migration fails
  }
};

/**
 * Initialize blog tables
 */
const initializeBlogDatabase = async () => {
  try {
    console.log('Initializing blog tables...');
    
    // Create blog_posts table
    await query(`CREATE TABLE IF NOT EXISTS blog_posts (
      id INTEGER PRIMARY KEY ${DB_TYPE === 'mysql' ? 'AUTO_INCREMENT' : 'AUTOINCREMENT'},
      title TEXT NOT NULL,
      slug ${DB_TYPE === 'mysql' ? 'VARCHAR(255)' : 'TEXT'} NOT NULL,
      content TEXT NOT NULL,
      excerpt TEXT,
      author ${DB_TYPE === 'mysql' ? 'VARCHAR(100)' : 'TEXT'} DEFAULT 'Gabi',
      published BOOLEAN DEFAULT FALSE,
      published_at TIMESTAMP NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      cover_image_path TEXT,
      cover_image_alt TEXT,
      UNIQUE(slug)
    )`);
    
    // Create blog_tags table
    await query(`CREATE TABLE IF NOT EXISTS blog_tags (
      id INTEGER PRIMARY KEY ${DB_TYPE === 'mysql' ? 'AUTO_INCREMENT' : 'AUTOINCREMENT'},
      tag ${DB_TYPE === 'mysql' ? 'VARCHAR(100)' : 'TEXT'} NOT NULL,
      UNIQUE(tag)
    )`);
    
    // Create blog_post_tags join table
    await query(`CREATE TABLE IF NOT EXISTS blog_post_tags (
      post_id INTEGER,
      tag_id INTEGER,
      PRIMARY KEY (post_id, tag_id),
      FOREIGN KEY (post_id) REFERENCES blog_posts(id) ON DELETE CASCADE,
      FOREIGN KEY (tag_id) REFERENCES blog_tags(id) ON DELETE CASCADE
    )`);
    
    // Create blog_post_images table
    await query(`CREATE TABLE IF NOT EXISTS blog_post_images (
      id INTEGER PRIMARY KEY ${DB_TYPE === 'mysql' ? 'AUTO_INCREMENT' : 'AUTOINCREMENT'},
      post_id INTEGER NOT NULL,
      url TEXT NOT NULL,
      file_path TEXT,
      alt TEXT,
      caption TEXT,
      FOREIGN KEY (post_id) REFERENCES blog_posts(id) ON DELETE CASCADE
    )`);
    
    // Migrate existing blog_posts table from cover_image_url to cover_image_path
    await migrateCoverImageColumns();
    
    console.log('Blog tables initialized successfully');
  } catch (error) {
    console.error('Error initializing blog tables:', error);
    throw error; // Re-throw to be handled by the server initialization
  }
};

module.exports = {
  initializeBlogDatabase
};

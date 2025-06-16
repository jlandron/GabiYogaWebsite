!
/**
 * Schema definition for blog tables
 * This file provides functions to initialize and manage blog tables
 */

const { query } = require('./db-config');

// Get the DB_TYPE from process.env or based on NODE_ENV
const NODE_ENV = process.env.NODE_ENV || 'development';
const DEFAULT_DB_TYPE = NODE_ENV === 'production' ? 'mysql' : 'sqlite';
const DB_TYPE = process.env.DB_TYPE || DEFAULT_DB_TYPE;

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
      cover_image_url TEXT,
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
    
    console.log('Blog tables initialized successfully');
  } catch (error) {
    console.error('Error initializing blog tables:', error);
    throw error; // Re-throw to be handled by the server initialization
  }
};

module.exports = {
  initializeBlogDatabase
};

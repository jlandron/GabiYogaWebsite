/**
 * Password Reset Schema for Gabi Yoga Website
 * 
 * This file provides database schema for password reset functionality.
 * It supports both SQLite (development) and MySQL/MariaDB (production).
 */

const NODE_ENV = process.env.NODE_ENV || 'development';
const DEFAULT_DB_TYPE = NODE_ENV === 'production' ? 'mysql' : 'sqlite';
const DB_TYPE = process.env.DB_TYPE || DEFAULT_DB_TYPE;

/**
 * Create password_reset_tokens table
 */
const createPasswordResetTokensTable = async (db) => {
  try {
    console.log(`Creating password_reset_tokens table for ${DB_TYPE} database...`);
    
    // Check if table exists based on database type
    let tableExists = false;
    
    if (DB_TYPE.toLowerCase() === 'mysql') {
      // MySQL approach to check if table exists
      const result = await db.query(`
        SELECT COUNT(*) as count FROM information_schema.tables 
        WHERE table_schema = DATABASE() 
        AND table_name = 'password_reset_tokens'
      `);
      tableExists = result[0].count > 0;
    } else {
      // SQLite approach to check if table exists
      const result = await db.query(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name='password_reset_tokens'
      `);
      tableExists = result.length > 0;
    }
    
    if (!tableExists) {
      console.log('Creating password_reset_tokens table...');
      
      // Create table if it doesn't exist, with appropriate syntax based on DB_TYPE
      await db.query(`
        CREATE TABLE IF NOT EXISTS password_reset_tokens (
          id INTEGER PRIMARY KEY ${DB_TYPE.toLowerCase() === 'mysql' ? 'AUTO_INCREMENT' : 'AUTOINCREMENT'},
          user_id INTEGER NOT NULL,
          token_hash ${DB_TYPE.toLowerCase() === 'mysql' ? 'VARCHAR(255)' : 'TEXT'} NOT NULL,
          expires_at DATETIME NOT NULL,
          created_at DATETIME NOT NULL,
          updated_at DATETIME NOT NULL,
          FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
        )
      `);
      
      // Create indexes for performance based on DB_TYPE
      if (DB_TYPE.toLowerCase() === 'mysql') {
        // Check if index exists before creating it (MySQL doesn't have IF NOT EXISTS for indexes)
        try {
          const indexExists = await db.query(`
            SELECT COUNT(*) as count FROM information_schema.statistics 
            WHERE table_schema = DATABASE() 
            AND table_name = 'password_reset_tokens' 
            AND index_name = 'idx_password_reset_tokens_user_id'
          `);
          
          if (indexExists[0].count === 0) {
            await db.query(`
              CREATE INDEX idx_password_reset_tokens_user_id 
              ON password_reset_tokens(user_id)
            `);
          } else {
            console.log('Index idx_password_reset_tokens_user_id already exists');
          }
        } catch (indexError) {
          console.log('Failed to check/create index, but continuing:', indexError.message);
        }
      } else {
        // SQLite supports IF NOT EXISTS for indexes
        await db.query(`
          CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id 
          ON password_reset_tokens(user_id)
        `);
      }
      
      console.log('password_reset_tokens table created successfully');
    } else {
      console.log('password_reset_tokens table already exists');
    }
  } catch (error) {
    console.error('Error creating password_reset_tokens table:', error);
    throw error;
  }
};

module.exports = {
  createPasswordResetTokensTable
};

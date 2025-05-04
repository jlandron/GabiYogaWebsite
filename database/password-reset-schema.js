/**
 * Password Reset Schema for Gabi Yoga Website
 * 
 * This file provides database schema for password reset functionality.
 */

/**
 * Create password_reset_tokens table
 */
const createPasswordResetTokensTable = async (db) => {
  try {
    // Check if table exists
    const tableExists = await db.query(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='password_reset_tokens'
    `);
    
    if (tableExists.length === 0) {
      console.log('Creating password_reset_tokens table...');
      
      // Create table if it doesn't exist
      await db.query(`
        CREATE TABLE password_reset_tokens (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          token_hash TEXT NOT NULL,
          expires_at DATETIME NOT NULL,
          created_at DATETIME NOT NULL,
          updated_at DATETIME NOT NULL,
          FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
        )
      `);
      
      // Create indexes for performance
      await db.query(`
        CREATE INDEX idx_password_reset_tokens_user_id 
        ON password_reset_tokens(user_id)
      `);
      
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

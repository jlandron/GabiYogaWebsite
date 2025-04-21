/**
 * Database Configuration for Yoga Website
 * 
 * This file provides a connection to the SQLite database
 * and exports utility functions for database operations.
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Ensure the data directory exists
const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Database file path
const DB_PATH = path.join(dataDir, 'yoga_dev.sqlite');

// Create the database connection
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Error connecting to SQLite database:', err);
    return;
  }
  
  console.log(`Connected to SQLite database: ${DB_PATH}`);
  
  // Enable foreign keys
  db.run('PRAGMA foreign_keys = ON;');
  
  // Only log environment in development
  if (process.env.NODE_ENV === 'development') {
    console.log('Connected to SQLite database (development environment)');
  }
});

/**
 * Execute a query on the database
 * 
 * @param {string} sql - SQL query to execute
 * @param {Array} params - Parameters for the query
 * @returns {Promise} - Resolves to the query results
 */
const query = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    if (sql.trim().toUpperCase().startsWith('SELECT')) {
      db.all(sql, params, (err, rows) => {
        if (err) {
          console.error('SQL error:', err);
          reject(err);
          return;
        }
        resolve(rows);
      });
    } else {
      db.run(sql, params, function(err) {
        if (err) {
          console.error('SQL error:', err);
          reject(err);
          return;
        }
        resolve({ lastID: this.lastID, changes: this.changes });
      });
    }
  });
};

/**
 * Check database connection
 * 
 * @returns {Promise} - Resolves when connection is verified
 */
const checkConnection = () => {
  return new Promise((resolve, reject) => {
    db.get('SELECT 1', [], (err) => {
      if (err) {
        console.error('Database connection check failed:', err);
        reject(err);
        return;
      }
      resolve(true);
    });
  });
};

/**
 * Close database connection
 * 
 * @returns {Promise} - Resolves when connection is closed
 */
const closeConnection = () => {
  return new Promise((resolve, reject) => {
    db.close((err) => {
      if (err) {
        console.error('Error closing database connection:', err);
        reject(err);
        return;
      }
      console.log('Database connection closed');
      resolve();
    });
  });
};

module.exports = {
  query,
  checkConnection,
  closeConnection
};

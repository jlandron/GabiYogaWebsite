/**
 * Database Configuration for Yoga Website
 * 
 * This file provides a connection to the database (SQLite for development, MySQL for production)
 * and exports utility functions for database operations.
 */

require('dotenv').config();

const path = require('path');
const fs = require('fs');

// Determine database type from environment
const DB_TYPE = process.env.DB_TYPE || 'sqlite';
let db;

// Configure database based on environment
if (DB_TYPE === 'sqlite') {
  // SQLite for development
  const sqlite3 = require('sqlite3').verbose();
  
  // Ensure the data directory exists
  const dataDir = path.join(__dirname, '../data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  // Database file path
  const DB_PATH = process.env.DB_PATH || path.join(dataDir, 'yoga_dev.sqlite');

  // Create the SQLite database connection
  db = new sqlite3.Database(DB_PATH, (err) => {
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
} else if (DB_TYPE === 'mysql') {
  // MySQL for production (AWS RDS)
  const mysql = require('mysql2');
  
  // Create MySQL connection
  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });
  
  // Promisify for async/await usage
  const promisePool = pool.promise();
  
  // Custom db object to match our interface
  db = {
    all: (sql, params, callback) => {
      promisePool.query(sql, params)
        .then(([rows]) => callback(null, rows))
        .catch(err => callback(err));
    },
    run: (sql, params, callback) => {
      promisePool.query(sql, params)
        .then(([result]) => {
          // Create a mock of the this context for SQLite compatibility
          const context = { 
            lastID: result.insertId,
            changes: result.affectedRows
          };
          callback.call(context);
        })
        .catch(err => callback(err));
    },
    get: (sql, params, callback) => {
      promisePool.query(sql, params)
        .then(([rows]) => callback(null, rows[0]))
        .catch(err => callback(err));
    },
    close: (callback) => {
      pool.end(callback);
    }
  };
  
  console.log(`Connected to MySQL database at ${process.env.DB_HOST}/${process.env.DB_NAME}`);
} else {
  throw new Error(`Unsupported database type: ${DB_TYPE}`);
}

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

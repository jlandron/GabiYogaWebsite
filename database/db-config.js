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
// Default to SQLite for development and MySQL for production,
// but allow explicit override through DB_TYPE environment variable
const NODE_ENV = process.env.NODE_ENV || 'development';
const DEFAULT_DB_TYPE = NODE_ENV === 'production' ? 'mysql' : 'sqlite';
const DB_TYPE = process.env.DB_TYPE || DEFAULT_DB_TYPE;

console.log(`Using database type: ${DB_TYPE} (${NODE_ENV} environment)`);
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
  const { getDatabaseCredentials } = require('../utils/aws-secrets');
  
  // We need to create a promise initially since database creation is asynchronous
  // but our module exports are synchronous
  let connectionPromise;
  let pool;
  let promisePool;
  
  // Initialize the db interface, which will make API calls once connection is ready
  db = {
    all: (sql, params, callback) => {
      // Ensure we have a connection before executing the query
      if (!connectionPromise) {
        connectionPromise = initializeMySQLConnection();
      }
      
      connectionPromise
        .then(() => {
          // Now that we have a connection, run the query
          console.log('MySQL query (all):', sql.substring(0, 100) + '...');
          promisePool.query(sql, params)
            .then(([rows]) => {
              console.log('MySQL query successful, rows:', rows.length);
              callback(null, rows);
            })
            .catch(err => {
              console.error('MySQL query error:', {
                code: err.code,
                errno: err.errno,
                sqlState: err.sqlState,
                sqlMessage: err.sqlMessage,
                sql: sql.substring(0, 200)
              });
              callback(err);
            });
        })
        .catch(err => {
          console.error('Connection error in query:', err);
          callback(err);
        });
    },
    
    run: (sql, params, callback) => {
      // Ensure we have a connection before executing the query
      if (!connectionPromise) {
        connectionPromise = initializeMySQLConnection();
      }
      
      connectionPromise
        .then(() => {
          console.log('MySQL query (run):', sql.substring(0, 100) + '...');
          promisePool.query(sql, params)
            .then(([result]) => {
              console.log('MySQL run successful');
              // Create a mock of the this context for SQLite compatibility
              const context = { 
                lastID: result.insertId,
                changes: result.affectedRows
              };
              callback.call(context);
            })
            .catch(err => {
              console.error('MySQL run error:', {
                code: err.code,
                errno: err.errno,
                sqlState: err.sqlState,
                sqlMessage: err.sqlMessage
              });
              callback(err);
            });
        })
        .catch(err => {
          console.error('Connection error in run:', err);
          callback(err);
        });
    },
    
    get: (sql, params, callback) => {
      // Ensure we have a connection before executing the query
      if (!connectionPromise) {
        connectionPromise = initializeMySQLConnection();
      }
      
      connectionPromise
        .then(() => {
          console.log('MySQL query (get):', sql.substring(0, 100) + '...');
          promisePool.query(sql, params)
            .then(([rows]) => {
              console.log('MySQL get successful');
              callback(null, rows[0]);
            })
            .catch(err => {
              console.error('MySQL get error:', {
                code: err.code,
                errno: err.errno,
                sqlState: err.sqlState,
                sqlMessage: err.sqlMessage
              });
              callback(err);
            });
        })
        .catch(err => {
          console.error('Connection error in get:', err);
          callback(err);
        });
    },
    
    close: (callback) => {
      if (pool) {
        pool.end((err) => {
          if (err) {
            console.error('Error closing MySQL pool:', err);
          } else {
            console.log('MySQL connection closed');
          }
          if (callback) callback(err);
        });
      } else {
        if (callback) callback();
      }
    }
  };
  
  // Function to initialize MySQL connection with AWS Secrets Manager
  async function initializeMySQLConnection() {
    try {
      console.log('Retrieving database credentials from AWS Secrets Manager...');
      // Get credentials from AWS Secrets Manager
      const credentials = await getDatabaseCredentials();
      
      console.log('Creating MySQL connection pool with credentials from AWS Secrets Manager');
      // Create MySQL connection pool with retrieved credentials
      pool = mysql.createPool({
        host: credentials.host || process.env.DB_HOST,
        port: credentials.port || process.env.DB_PORT || 3306,
        database: credentials.dbname || process.env.DB_NAME,
        user: credentials.username || process.env.DB_USER,
        password: credentials.password || process.env.DB_PASSWORD,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        // Add configuration for handling large data
        maxAllowedPacket: 16 * 1024 * 1024, // 16MB packet size (client side)
        connectTimeout: 60000, // 60 seconds
        acquireTimeout: 60000, // 60 seconds
        timeout: 60000, // 60 seconds
        // Enable compression to help with large data transfers
        compress: true,
        // Better error handling
        debug: process.env.NODE_ENV !== 'production',
        // Use streams for BLOBs for better memory management
        supportBigNumbers: true,
        bigNumberStrings: true
      });
      
      // Handle pool errors globally
      pool.on('error', (err) => {
        console.error('MySQL Pool Error:', err);
        if (err.code === 'ER_PACKET_TOO_LARGE') {
          console.error('MySQL Error: Packet too large. Consider increasing max_allowed_packet on MySQL server.');
        }
      });
      
      // Promisify for async/await usage
      promisePool = pool.promise();
      
      // Test connection
      const [rows] = await promisePool.query('SELECT 1');
      console.log(`Connected to MySQL database at ${credentials.host}/${credentials.dbname}`);
      
      return rows;
    } catch (error) {
      console.error('Error setting up MySQL connection with AWS Secrets:', error);
      throw error;
    }
  }
  
  // Start the connection process
  connectionPromise = initializeMySQLConnection().catch(err => {
    console.error('Initial MySQL connection failed:', err);
    throw err;
  });
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

#!/usr/bin/env node

/**
 * Add Admin User Script for Gabi Jyoti Yoga Website
 * 
 * This script adds an admin user to the database.
 * It can be run locally or in AWS after deployment.
 * 
 * Usage:
 *   AWS: node add-admin-user.js --email=admin@example.com --password=securepassword --firstName=Admin --lastName=User
 */

// Load environment variables
require('dotenv').config();
const bcrypt = require('bcryptjs');

// Check if running in MongoDB or SQL mode
const DB_USE_MONGOOSE = process.env.DB_USE_MONGOOSE === 'true';

async function addAdminUser() {
  try {
    // Get command line arguments
    const args = parseArguments();
    
    // Validate required arguments
    if (!args.email || !args.password || !args.firstName || !args.lastName) {
      console.error('Missing required arguments. Usage:');
      console.error('node add-admin-user.js --email=admin@example.com --password=securepassword --firstName=Admin --lastName=User');
      process.exit(1);
    }
    
    console.log(`Adding admin user: ${args.firstName} ${args.lastName} (${args.email})`);
    
    if (DB_USE_MONGOOSE) {
      await addAdminUserToMongoDB(args);
    } else {
      await addAdminUserToSQL(args);
    }
    
    console.log('Admin user added successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error adding admin user:', error);
    process.exit(1);
  }
}

/**
 * Parse command line arguments
 */
function parseArguments() {
  const args = {};
  process.argv.slice(2).forEach(arg => {
    // Handle --key=value format
    if (arg.startsWith('--')) {
      const [key, value] = arg.slice(2).split('=');
      args[key] = value;
    }
  });
  return args;
}

/**
 * Add admin user to MongoDB database
 */
async function addAdminUserToMongoDB(args) {
  // Import mongoose and models
  const mongoose = require('mongoose');
  const { User } = require('../database/models');
  
  // Connect to MongoDB
  const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/gabiyoga';
  
  console.log(`Connecting to MongoDB at ${MONGODB_URI}`);
  await mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });
  
  // Check if user already exists
  const existingUser = await User.findOne({ email: args.email });
  if (existingUser) {
    if (existingUser.role === 'admin') {
      console.log(`User ${args.email} already exists as admin`);
      return;
    } else {
      console.log(`Updating existing user ${args.email} to admin role`);
      existingUser.role = 'admin';
      await existingUser.save();
      return;
    }
  }
  
  // Hash password
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(args.password, salt);
  
  // Create new admin user
  const adminUser = new User({
    firstName: args.firstName,
    lastName: args.lastName,
    email: args.email,
    password: hashedPassword,
    role: 'admin'
  });
  
  // Save to database
  await adminUser.save();
  console.log(`MongoDB: Admin user created with ID ${adminUser._id}`);
  
  // Close database connection
  await mongoose.connection.close();
}

/**
 * Add admin user to SQL database
 */
async function addAdminUserToSQL(args) {
  // Import db config
  const db = require('../database/db-config');
  
  try {
    // Check database connection
    await db.checkConnection();
    console.log('Connected to SQL database');
    
    // Check if user already exists
    const existingUsers = await db.query(
      'SELECT user_id, role FROM users WHERE email = ?',
      [args.email]
    );
    
    if (existingUsers.length > 0) {
      const existingUser = existingUsers[0];
      if (existingUser.role === 'admin') {
        console.log(`User ${args.email} already exists as admin`);
        return;
      } else {
        console.log(`Updating existing user ${args.email} to admin role`);
        await db.query(
          'UPDATE users SET role = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?',
          ['admin', existingUser.user_id]
        );
        return;
      }
    }
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(args.password, salt);
    
    // SQLite uses different date functions than MySQL
    let insertQuery;
    if (process.env.DB_TYPE === 'sqlite') {
      insertQuery = `
        INSERT INTO users (
          first_name, 
          last_name, 
          email, 
          password_hash, 
          role, 
          created_at, 
          updated_at
        ) VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `;
    } else {
      // MySQL/Aurora
      insertQuery = `
        INSERT INTO users (
          first_name, 
          last_name, 
          email, 
          password_hash, 
          role, 
          created_at, 
          updated_at
        ) VALUES (?, ?, ?, ?, ?, NOW(), NOW())
      `;
    }
    
    // Create new admin user
    const result = await db.query(
      insertQuery,
      [args.firstName, args.lastName, args.email, hashedPassword, 'admin']
    );
    
    console.log(`SQL: Admin user created with ID ${result.lastID}`);
    
    // Close database connection
    await db.closeConnection();
  } catch (error) {
    console.error('SQL Database error:', error);
    throw error;
  }
}

// Run the script
addAdminUser();

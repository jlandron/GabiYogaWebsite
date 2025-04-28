/**
 * Pricing Database Schema Updates for Yoga Website
 * 
 * This file adds additional tables for pricing and offerings management
 * to be integrated with the existing database schema.
 */

const db = require('./db-config');
const NODE_ENV = process.env.NODE_ENV || 'development';
const DEFAULT_DB_TYPE = NODE_ENV === 'production' ? 'mysql' : 'sqlite';
const DB_TYPE = process.env.DB_TYPE || DEFAULT_DB_TYPE;

/**
 * Create pricing-related database tables
 */
const createPricingSchema = async () => {
  try {
    console.log('Creating pricing schema tables...');
    
    // Membership Types table
    await db.query(`
      CREATE TABLE IF NOT EXISTS membership_types (
        id INTEGER PRIMARY KEY ${DB_TYPE === 'mysql' ? 'AUTO_INCREMENT' : 'AUTOINCREMENT'},
        type ${DB_TYPE === 'mysql' ? 'VARCHAR(100)' : 'TEXT'} NOT NULL,
        description TEXT,
        price REAL NOT NULL,
        duration_days INTEGER,
        classes INTEGER,
        auto_renew_allowed BOOLEAN DEFAULT 1,
        most_popular BOOLEAN DEFAULT 0,
        status ${DB_TYPE === 'mysql' ? 'VARCHAR(50)' : 'TEXT'} DEFAULT 'active' NOT NULL, -- 'active', 'inactive'
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);
    
    // Session Packages table
    await db.query(`
      CREATE TABLE IF NOT EXISTS session_packages (
        id INTEGER PRIMARY KEY ${DB_TYPE === 'mysql' ? 'AUTO_INCREMENT' : 'AUTOINCREMENT'},
        name ${DB_TYPE === 'mysql' ? 'VARCHAR(100)' : 'TEXT'} NOT NULL,
        description TEXT,
        sessions INTEGER NOT NULL,
        price REAL NOT NULL,
        session_duration INTEGER DEFAULT 60 NOT NULL, -- in minutes
        focus_options TEXT, -- JSON array of focus option strings
        status ${DB_TYPE === 'mysql' ? 'VARCHAR(50)' : 'TEXT'} DEFAULT 'active' NOT NULL, -- 'active', 'inactive'
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);
    
    // Create indexes for better performance
    console.log(`Creating indexes with database type: ${DB_TYPE} (NODE_ENV: ${NODE_ENV})`);
    
    // Force MySQL approach for production or if DB_TYPE is mysql (case insensitive)
    if (NODE_ENV === 'production' || DB_TYPE.toLowerCase() === 'mysql') {
      console.log('Using MySQL-compatible index creation (no IF NOT EXISTS)');
      
      // Helper function to create MySQL-compatible indexes with proper length for TEXT fields
      const createMySQLIndex = async (indexName, tableName, columns, textLength = 32) => {
        try {
          console.log(`Creating index ${indexName} on ${tableName}(${columns})...`);
          // For TEXT columns, we need to specify a length
          const formattedColumns = columns.includes('status') ? `${columns}(${textLength})` : columns;
          await db.query(`CREATE INDEX ${indexName} ON ${tableName} (${formattedColumns})`);
          console.log(`Successfully created index ${indexName}`);
        } catch (err) {
          // If error is about index already existing, ignore it
          if (err.message && (err.message.includes('Duplicate') || err.message.includes('already exists'))) {
            console.log(`Index ${indexName} already exists (expected)`);
          } else {
            console.error(`Error creating index ${indexName}:`, err);
            console.log(`Failed to create index ${indexName}, but continuing: ${err.message}`);
          }
        }
      };
      
      // Create indexes with error handling for each
      await createMySQLIndex('idx_membership_types_status', 'membership_types', 'status');
      await createMySQLIndex('idx_session_packages_status', 'session_packages', 'status');
    } else {
      console.log('Using SQLite-compatible index creation (with IF NOT EXISTS)');
      // SQLite supports IF NOT EXISTS for indexes
      await db.query(`CREATE INDEX IF NOT EXISTS idx_membership_types_status ON membership_types (status)`);
      await db.query(`CREATE INDEX IF NOT EXISTS idx_session_packages_status ON session_packages (status)`);
    }
    
    console.log('Pricing schema tables created successfully');
  } catch (error) {
    console.error('Error creating pricing schema tables:', error);
    throw error;
  }
};

/**
 * Add initial pricing data for development
 */
const seedPricingData = async () => {
  try {
    console.log('Seeding pricing data...');
    
    const now = new Date().toISOString();
    
    // Check if membership types already exist
    const existingMembershipTypes = await db.query('SELECT COUNT(*) as count FROM membership_types');
    
    if (existingMembershipTypes[0].count === 0) {
      // Add default membership types
      await db.query(`
        INSERT INTO membership_types (
          type, 
          description, 
          price, 
          duration_days, 
          classes, 
          auto_renew_allowed, 
          status, 
          created_at, 
          updated_at
        ) VALUES 
        (
          'Monthly Unlimited', 
          'Unlimited access to all regular classes for one month', 
          120, 
          30, 
          NULL, 
          1, 
          'active', 
          ?, 
          ?
        ),
        (
          'Annual Unlimited', 
          'Unlimited access to all regular classes for one year. Best value!', 
          1200, 
          365, 
          NULL, 
          1, 
          'active', 
          ?, 
          ?
        ),
        (
          'Class Pack (10)', 
          'Pack of 10 classes to use whenever you want. No expiration.', 
          150, 
          NULL, 
          10, 
          0, 
          'active', 
          ?, 
          ?
        ),
        (
          'Class Pack (5)', 
          'Pack of 5 classes to use whenever you want. No expiration.', 
          80, 
          NULL, 
          5, 
          0, 
          'active', 
          ?, 
          ?
        ),
        (
          'Drop-in', 
          'Single class access', 
          18, 
          NULL, 
          1, 
          0, 
          'active', 
          ?, 
          ?
        )
      `, [now, now, now, now, now, now, now, now, now, now]);
      
      console.log('Default membership types added');
    }
    
    // Check if session packages already exist
    const existingSessionPackages = await db.query('SELECT COUNT(*) as count FROM session_packages');
    
    if (existingSessionPackages[0].count === 0) {
      // Define focus options
      const focusOptions = JSON.stringify([
        'Beginners Introduction',
        'Alignment & Technique',
        'Strength & Flexibility',
        'Inversions & Arm Balances',
        'Restorative & Relaxation',
        'Pranayama & Breathwork',
        'Meditation & Mindfulness',
        'Custom Focus'
      ]);
      
      // Add default session packages
      await db.query(`
        INSERT INTO session_packages (
          name, 
          description, 
          sessions, 
          price, 
          session_duration, 
          focus_options, 
          status, 
          created_at, 
          updated_at
        ) VALUES 
        (
          'Single Session', 
          '60-minute one-on-one private yoga session', 
          1, 
          80, 
          60, 
          ?, 
          'active', 
          ?, 
          ?
        ),
        (
          '3-Session Package', 
          'Package of three 60-minute private sessions at a discounted rate', 
          3, 
          225, 
          60, 
          ?, 
          'active', 
          ?, 
          ?
        ),
        (
          '5-Session Package', 
          'Package of five 60-minute private sessions at our best rate', 
          5, 
          350, 
          60, 
          ?, 
          'active', 
          ?, 
          ?
        ),
        (
          'Extended Session', 
          '90-minute in-depth private yoga session', 
          1, 
          110, 
          90, 
          ?, 
          'active', 
          ?, 
          ?
        )
      `, [focusOptions, now, now, focusOptions, now, now, focusOptions, now, now, focusOptions, now, now]);
      
      console.log('Default session packages added');
    }
    
    console.log('Pricing data seeding complete');
  } catch (error) {
    console.error('Error seeding pricing data:', error);
    throw error;
  }
};

/**
 * Initialize pricing database
 * Creates schema and seeds data if needed
 */
const initializePricingDatabase = async () => {
  try {
    // Create pricing tables
    await createPricingSchema();
    
    // Seed initial data for development
    if (process.env.NODE_ENV === 'development') {
      await seedPricingData();
    }
    
    console.log('Pricing database initialization complete');
  } catch (error) {
    console.error('Error initializing pricing database:', error);
    throw error;
  }
};

module.exports = {
  createPricingSchema,
  seedPricingData,
  initializePricingDatabase
};

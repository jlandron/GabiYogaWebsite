/**
 * Updated Database Schema for Yoga Website
 * 
 * This file defines the SQLite database schema to match the MariaDB schema
 * and provides functionality to initialize and seed the database.
 */

const db = require('./db-config');

/**
 * Create all database tables
 */
const createSchema = async () => {
  try {
    console.log('Creating database schema...');
    
    // Users table
    await db.query(`
      CREATE TABLE IF NOT EXISTS users (
        user_id INTEGER PRIMARY KEY AUTOINCREMENT,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        phone TEXT,
        address TEXT,
        city TEXT,
        state TEXT,
        zip TEXT,
        birthday TEXT,
        emergency_contact TEXT,
        emergency_phone TEXT,
        profile_picture TEXT,
        role TEXT DEFAULT 'member' NOT NULL, -- 'admin', 'member', 'instructor'
        bio TEXT,
        health_notes TEXT,
        notes TEXT,
        active BOOLEAN DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);
    
    // Memberships table
    await db.query(`
      CREATE TABLE IF NOT EXISTS memberships (
        membership_id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        membership_type TEXT NOT NULL, -- 'Monthly Unlimited', 'Annual Unlimited', 'Class Pack', etc.
        start_date TEXT NOT NULL,
        end_date TEXT,
        classes_remaining INTEGER, -- Only for class packs
        auto_renew BOOLEAN DEFAULT 0,
        status TEXT DEFAULT 'Active', -- 'Active', 'Expired', 'Cancelled', 'Pending'
        price REAL NOT NULL,
        payment_method TEXT, -- 'Credit Card', 'Cash', 'PayPal', etc.
        card_last_four TEXT,
        payment_reference TEXT, -- Reference to payment gateway
        notes TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE
      )
    `);
    
    // Class Templates table (for reusable class definitions)
    await db.query(`
      CREATE TABLE IF NOT EXISTS class_templates (
        template_id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        duration INTEGER NOT NULL, -- in minutes
        level TEXT, -- 'All Levels', 'Beginner', 'Intermediate', 'Advanced'
        default_instructor TEXT,
        description TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);
    
    // Classes table (recurring classes on the schedule)
    await db.query(`
      CREATE TABLE IF NOT EXISTS classes (
        class_id INTEGER PRIMARY KEY AUTOINCREMENT,
        template_id INTEGER,
        name TEXT NOT NULL,
        day_of_week INTEGER NOT NULL, -- 0 = Sunday, 1 = Monday, etc.
        start_time TEXT NOT NULL, -- '14:00', '09:30'
        duration INTEGER NOT NULL, -- in minutes
        instructor TEXT,
        level TEXT, -- 'All Levels', 'Beginner', 'Intermediate', 'Advanced'
        capacity INTEGER DEFAULT 20,
        description TEXT,
        active BOOLEAN DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (template_id) REFERENCES class_templates (template_id) ON DELETE SET NULL
      )
    `);
    
    // Bookings table (specific class instance bookings)
    await db.query(`
      CREATE TABLE IF NOT EXISTS bookings (
        booking_id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        class_id INTEGER NOT NULL,
        date TEXT NOT NULL, -- The specific date for this booking
        status TEXT NOT NULL DEFAULT 'Confirmed', -- 'Confirmed', 'Cancelled', 'Waitlist', 'Attended', 'No-show'
        booking_date TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE,
        FOREIGN KEY (class_id) REFERENCES classes (class_id) ON DELETE CASCADE
      )
    `);
    
    // Workshops table - Updated to match MariaDB schema
    await db.query(`
      CREATE TABLE IF NOT EXISTS workshops (
        workshop_id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        date TEXT NOT NULL,
        start_time TEXT NOT NULL,
        end_time TEXT NOT NULL,
        instructor TEXT,
        capacity INTEGER NOT NULL,
        price REAL NOT NULL,
        member_price REAL,
        early_bird_price REAL,
        early_bird_deadline TEXT,
        location TEXT,
        image_url TEXT,
        workshop_slug TEXT UNIQUE,
        active BOOLEAN DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);
    
    // Workshop Registrations table - Updated to match MariaDB schema
    await db.query(`
      CREATE TABLE IF NOT EXISTS workshop_registrations (
        registration_id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        workshop_id INTEGER NOT NULL,
        registration_date TEXT NOT NULL,
        payment_status TEXT NOT NULL DEFAULT 'Pending', -- 'Paid', 'Pending', 'Refunded'
        payment_method TEXT, -- 'Credit Card', 'PayPal', 'Cash', 'At Studio', 'Other'
        card_last_four TEXT,
        payment_reference TEXT,
        amount_paid REAL,
        attended BOOLEAN DEFAULT 0,
        notes TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE,
        FOREIGN KEY (workshop_id) REFERENCES workshops (workshop_id) ON DELETE CASCADE
      )
    `);
    
    // Private Sessions table - Updated to match MariaDB schema
    await db.query(`
      CREATE TABLE IF NOT EXISTS private_sessions (
        session_id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        date TEXT NOT NULL,
        start_time TEXT NOT NULL,
        duration INTEGER NOT NULL, -- in minutes
        focus TEXT, -- 'Beginners Introduction', 'Alignment & Technique', etc.
        custom_focus_details TEXT,
        package_type TEXT, -- 'Single Session', '3-Session Package', '5-Session Package'
        session_number INTEGER DEFAULT 1,
        price REAL NOT NULL,
        location TEXT,
        notes TEXT,
        client_notes TEXT,
        status TEXT NOT NULL DEFAULT 'Pending', -- 'Confirmed', 'Pending', 'Cancelled', 'Completed'
        payment_status TEXT DEFAULT 'Pending', -- 'Paid', 'Pending', 'Refunded'
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE
      )
    `);
    
    // Payments table
    await db.query(`
      CREATE TABLE IF NOT EXISTS payments (
        payment_id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        amount REAL NOT NULL,
        payment_date TEXT NOT NULL,
        payment_method TEXT NOT NULL, -- 'Credit Card', 'Cash', 'Check', etc.
        payment_reference TEXT, -- Reference from payment gateway
        payment_type TEXT NOT NULL, -- 'membership', 'workshop', 'private_session', 'retail'
        related_id INTEGER, -- ID of the membership, workshop registration, or session
        notes TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE
      )
    `);
    
    // Instructor Availability table
    await db.query(`
      CREATE TABLE IF NOT EXISTS instructor_availability (
        availability_id INTEGER PRIMARY KEY AUTOINCREMENT,
        day_of_week INTEGER NOT NULL, -- 0 = Sunday, 1 = Monday, etc.
        available BOOLEAN DEFAULT 1,
        start_time TEXT,
        end_time TEXT,
        notes TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);
    
    // Instructor Unavailability table (specific dates)
    await db.query(`
      CREATE TABLE IF NOT EXISTS unavailable_dates (
        unavailable_id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL, -- The date instructor is unavailable
        end_date TEXT, -- If range
        reason TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);

    // Gallery Images table
    await db.query(`
      CREATE TABLE IF NOT EXISTS gallery_images (
        image_id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT,
        description TEXT,
        image_url TEXT NOT NULL,
        display_order INTEGER DEFAULT 0,
        active BOOLEAN DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);

    // Retreats table
    await db.query(`
      CREATE TABLE IF NOT EXISTS retreats (
        retreat_id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        subtitle TEXT,
        description TEXT,
        detailed_itinerary TEXT,
        accommodations TEXT,
        included_items TEXT,
        start_date TEXT NOT NULL,
        end_date TEXT NOT NULL,
        location TEXT NOT NULL,
        venue_name TEXT,
        price REAL NOT NULL,
        member_price REAL,
        early_bird_price REAL,
        early_bird_deadline TEXT,
        deposit_amount REAL,
        capacity INTEGER NOT NULL,
        instructors TEXT NOT NULL,
        image_url TEXT,
        gallery_images TEXT, -- JSON array of image URLs
        retreat_slug TEXT UNIQUE,
        active BOOLEAN DEFAULT 0,
        featured BOOLEAN DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);

    // Retreat Registrations table
    await db.query(`
      CREATE TABLE IF NOT EXISTS retreat_registrations (
        registration_id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        retreat_id INTEGER NOT NULL,
        registration_date TEXT NOT NULL,
        payment_status TEXT NOT NULL DEFAULT 'Pending', -- 'Deposit Paid', 'Full Payment', 'Partial Payment', 'Pending', 'Refunded', 'Cancelled'
        payment_method TEXT, -- 'Credit Card', 'PayPal', 'Bank Transfer', 'Cash', 'Other'
        card_last_four TEXT,
        payment_reference TEXT,
        amount_paid REAL,
        balance_due REAL,
        special_requests TEXT,
        dietary_restrictions TEXT,
        emergency_contact TEXT,
        notes TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE,
        FOREIGN KEY (retreat_id) REFERENCES retreats (retreat_id) ON DELETE CASCADE
      )
    `);

    // Newsletter Subscribers table
    await db.query(`
      CREATE TABLE IF NOT EXISTS newsletter_subscribers (
        subscriber_id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        active BOOLEAN DEFAULT 1,
        subscribe_date TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);
    
    // Create indexes for better performance
    await db.query(`CREATE INDEX IF NOT EXISTS idx_users_email ON users (email)`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_users_role ON users (role)`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_memberships_user_id ON memberships (user_id)`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_memberships_dates ON memberships (start_date, end_date)`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_classes_day_time ON classes (day_of_week, start_time)`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings (date)`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings (user_id)`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_workshops_date ON workshops (date)`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_workshops_slug ON workshops (workshop_slug)`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_private_sessions_date ON private_sessions (date)`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments (user_id)`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_payments_date ON payments (payment_date)`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_retreats_active ON retreats (active)`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_retreats_featured ON retreats (featured)`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_retreats_slug ON retreats (retreat_slug)`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_newsletter_email ON newsletter_subscribers (email)`);
    
    // Website Settings table
    await db.query(`
      CREATE TABLE IF NOT EXISTS website_settings (
        id INTEGER PRIMARY KEY,
        settings_json TEXT NOT NULL, -- Stores all settings as a JSON string
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);
    
    console.log('Database schema created successfully');
  } catch (error) {
    console.error('Error creating database schema:', error);
    throw error;
  }
};

/**
 * Reset the database (development only)
 */
const resetDatabase = async () => {
  if (process.env.NODE_ENV !== 'development') {
    console.error('Cannot reset database in non-development environment');
    return;
  }
  
  try {
    console.log('Resetting database...');
    
    // Disable foreign keys temporarily to make dropping tables easier
    await db.query(`PRAGMA foreign_keys = OFF;`);
    
    // Drop tables in reverse order of creation to respect foreign key relationships
    await db.query(`DROP TABLE IF EXISTS newsletter_subscribers`);
    await db.query(`DROP TABLE IF EXISTS retreat_registrations`);
    await db.query(`DROP TABLE IF EXISTS retreats`);
    await db.query(`DROP TABLE IF EXISTS gallery_images`);
    await db.query(`DROP TABLE IF EXISTS payments`);
    await db.query(`DROP TABLE IF EXISTS workshop_registrations`);
    await db.query(`DROP TABLE IF EXISTS bookings`);
    await db.query(`DROP TABLE IF EXISTS private_sessions`);
    await db.query(`DROP TABLE IF EXISTS workshops`);
    await db.query(`DROP TABLE IF EXISTS classes`);
    await db.query(`DROP TABLE IF EXISTS memberships`);
    await db.query(`DROP TABLE IF EXISTS unavailable_dates`);
    await db.query(`DROP TABLE IF EXISTS instructor_availability`);
    await db.query(`DROP TABLE IF EXISTS class_templates`);
    await db.query(`DROP TABLE IF EXISTS users`);
    
    // Re-enable foreign keys
    await db.query(`PRAGMA foreign_keys = ON;`);
    
    console.log('Database reset successfully');
  } catch (error) {
    console.error('Error resetting database:', error);
    throw error;
  }
};

/**
 * Initialize database
 * Creates schema if not exists
 */
const initializeDatabase = async () => {
  try {
    // Check connection
    await db.checkConnection();
    
    // Create schema
    await createSchema();
    
    console.log('Database initialization complete');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
};

module.exports = {
  createSchema,
  resetDatabase,
  initializeDatabase
};

/**
 * Template Seeder for Yoga Website
 * 
 * This script exports class templates from development and imports them to production
 * without wiping existing data. It's designed to be run as part of the deployment process.
 */

require('dotenv').config();
const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const mysql = require('mysql2/promise');

// Get DB configuration
const NODE_ENV = process.env.NODE_ENV || 'development';
const FORCE_PROD = process.argv.includes('--production');
const IS_PROD = NODE_ENV === 'production' || FORCE_PROD;
const exportOnly = process.argv.includes('--export-only');
const importOnly = process.argv.includes('--import-only');
const templatesFile = path.join(__dirname, '../data/templates-export.json');

// Log current mode
console.log(`Running in ${IS_PROD ? 'production' : 'development'} mode`);
if (exportOnly) console.log('Export only mode');
if (importOnly) console.log('Import only mode');

/**
 * Connect to SQLite database (Development)
 */
const connectToSqlite = () => {
  const dataDir = path.join(__dirname, '../data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  
  const DB_PATH = process.env.DB_PATH || path.join(dataDir, 'yoga_dev.sqlite');
  
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        console.error('Error connecting to SQLite database:', err);
        reject(err);
        return;
      }
      console.log(`Connected to SQLite database: ${DB_PATH}`);
      resolve(db);
    });
  });
};

/**
 * Connect to MySQL database (Production)
 */
const connectToMysql = async () => {
  try {
    const pool = await mysql.createPool({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT || 3306,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });
    
    console.log(`Connected to MySQL database at ${process.env.DB_HOST}/${process.env.DB_NAME}`);
    return pool;
  } catch (err) {
    console.error('Error connecting to MySQL database:', err);
    throw err;
  }
};

/**
 * Export templates from SQLite database
 */
const exportTemplates = (db) => {
  return new Promise((resolve, reject) => {
    const query = `SELECT * FROM class_templates`;
    
    db.all(query, [], (err, rows) => {
      if (err) {
        console.error('Error querying templates:', err);
        reject(err);
        return;
      }
      
      console.log(`Found ${rows.length} templates in development database`);
      resolve(rows);
    });
  });
};

/**
 * Save templates to JSON file
 */
const saveTemplatesToFile = (templates) => {
  try {
    const dataDir = path.join(__dirname, '../data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    fs.writeFileSync(templatesFile, JSON.stringify(templates, null, 2));
    console.log(`Templates exported to ${templatesFile}`);
  } catch (err) {
    console.error('Error saving templates to file:', err);
    throw err;
  }
};

/**
 * Load templates from JSON file
 */
const loadTemplatesFromFile = () => {
  try {
    if (!fs.existsSync(templatesFile)) {
      console.error(`Templates file not found: ${templatesFile}`);
      return [];
    }
    
    const templates = JSON.parse(fs.readFileSync(templatesFile, 'utf8'));
    console.log(`Loaded ${templates.length} templates from file`);
    return templates;
  } catch (err) {
    console.error('Error loading templates from file:', err);
    throw err;
  }
};

/**
 * Import templates to MySQL database with duplicate checking
 */
const importTemplates = async (pool, templates) => {
  try {
    // Get existing templates from production
    const [existingTemplates] = await pool.query('SELECT name FROM class_templates');
    const existingNames = new Set(existingTemplates.map(template => template.name.toLowerCase()));
    
    console.log(`Found ${existingNames.size} existing templates in production database`);
    
    // Filter templates to only include new ones
    const newTemplates = templates.filter(template => {
      const templateNameLower = template.name.toLowerCase();
      return !existingNames.has(templateNameLower);
    });
    
    console.log(`Importing ${newTemplates.length} new templates to production`);
    
    if (newTemplates.length === 0) {
      console.log('No new templates to import');
      return [];
    }
    
    // Import new templates
    const importedTemplates = [];
    for (const template of newTemplates) {
      const currentDate = new Date().toISOString();
      
      // Execute insert query
      await pool.query(
        `INSERT INTO class_templates (
          name, duration, level, default_instructor, description, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          template.name,
          template.duration,
          template.level,
          template.default_instructor,
          template.description,
          currentDate,
          currentDate
        ]
      );
      
      importedTemplates.push(template.name);
    }
    
    return importedTemplates;
  } catch (err) {
    console.error('Error importing templates:', err);
    throw err;
  }
};

/**
 * Main function to export templates from development SQLite and import to production MySQL
 */
const seedTemplates = async () => {
  let sqliteDb = null;
  let mysqlPool = null;
  
  try {
    // Step 1: Export templates from SQLite (if not in import-only mode)
    if (!importOnly) {
      sqliteDb = await connectToSqlite();
      const templates = await exportTemplates(sqliteDb);
      await saveTemplatesToFile(templates);
      
      if (sqliteDb) {
        sqliteDb.close();
        console.log('SQLite connection closed');
      }
    }
    
    // Step 2: Import templates to MySQL (if in production mode and not in export-only mode)
    if (IS_PROD && !exportOnly) {
      const templates = loadTemplatesFromFile();
      
      if (templates.length > 0) {
        mysqlPool = await connectToMysql();
        const importedTemplates = await importTemplates(mysqlPool, templates);
        
        if (importedTemplates.length > 0) {
          console.log('Successfully imported the following templates:');
          importedTemplates.forEach(name => console.log(`- ${name}`));
        }
        
        if (mysqlPool) {
          await mysqlPool.end();
          console.log('MySQL connection closed');
        }
      }
    }
    
    console.log('Template seeding completed successfully');
  } catch (error) {
    console.error('Error seeding templates:', error);
    
    // Ensure connections are closed on error
    if (sqliteDb) {
      sqliteDb.close(() => console.log('SQLite connection closed on error'));
    }
    
    if (mysqlPool) {
      await mysqlPool.end();
      console.log('MySQL connection closed on error');
    }
    
    throw error;
  }
};

// Run the seeding function if this file is called directly
if (require.main === module) {
  seedTemplates()
    .then(() => {
      console.log('Template seeding script completed');
      process.exit(0);
    })
    .catch(err => {
      console.error('Template seeding script failed:', err);
      process.exit(1);
    });
} else {
  // Export function for use in other modules
  module.exports = {
    seedTemplates
  };
}

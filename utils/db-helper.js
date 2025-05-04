/**
 * Database Helper Utils
 * 
 * Utility functions to help with database operations across different database types
 */

/**
 * Get the appropriate SQL datetime function based on database type
 * 
 * @returns {string} SQL datetime function for the current date/time
 */
const getDatetimeFunction = () => {
  const NODE_ENV = process.env.NODE_ENV || 'development';
  const DEFAULT_DB_TYPE = NODE_ENV === 'production' ? 'mysql' : 'sqlite';
  const DB_TYPE = process.env.DB_TYPE || DEFAULT_DB_TYPE;
  
  return DB_TYPE.toLowerCase() === 'mysql' ? 'NOW()' : "datetime('now')";
};

module.exports = {
  getDatetimeFunction
};

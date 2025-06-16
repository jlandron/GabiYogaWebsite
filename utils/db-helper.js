/**
 * Database Helper Utils
 * 
 * Utility functions to help with database operations across different database types
 */

/**
 * Get database type from environment
 * @returns {string} Database type ('mysql' or 'sqlite')
 */
const getDbType = () => {
  const NODE_ENV = process.env.NODE_ENV || 'development';
  const DEFAULT_DB_TYPE = NODE_ENV === 'production' ? 'mysql' : 'sqlite';
  return (process.env.DB_TYPE || DEFAULT_DB_TYPE).toLowerCase();
};

/**
 * Get the appropriate SQL datetime function based on database type
 * 
 * @returns {string} SQL datetime function for the current date/time
 */
const getDatetimeFunction = () => {
  return getDbType() === 'mysql' ? 'NOW()' : "datetime('now')";
};

/**
 * Get the current date function based on database type
 * 
 * @returns {string} SQL date function for the current date
 */
const getCurrentDateFunction = () => {
  return getDbType() === 'mysql' ? 'CURDATE()' : "date('now')";
};

/**
 * Get date arithmetic function for subtracting days
 * 
 * @param {number} days - Number of days to subtract
 * @returns {string} SQL for date minus specified days
 */
const getDateSubtractFunction = (days) => {
  return getDbType() === 'mysql' 
    ? `DATE_SUB(CURDATE(), INTERVAL ${days} DAY)`
    : `date('now', '-${days} days')`;
};

/**
 * Get date arithmetic function for adding days
 * 
 * @param {number} days - Number of days to add
 * @returns {string} SQL for date plus specified days
 */
const getDateAddFunction = (days) => {
  return getDbType() === 'mysql' 
    ? `DATE_ADD(CURDATE(), INTERVAL ${days} DAY)`
    : `date('now', '+${days} days')`;
};

/**
 * Get string concatenation function
 * 
 * @param {string[]} strings - Array of strings/column names to concatenate
 * @returns {string} SQL for string concatenation
 */
const getConcatFunction = (strings) => {
  if (getDbType() === 'mysql') {
    return `CONCAT(${strings.join(', ')})`;
  } else {
    return `${strings.join(' || ')}`; // SQLite uses || for concatenation
  }
};

/**
 * Get date range comparison for weekly data
 * 
 * @param {string} dateColumn - Column name containing the date
 * @returns {string} SQL WHERE clause for current week range
 */
const getWeeklyDateRange = (dateColumn = 'date') => {
  if (getDbType() === 'mysql') {
    return `${dateColumn} BETWEEN DATE_SUB(CURDATE(), INTERVAL 7 DAY) AND DATE_ADD(CURDATE(), INTERVAL 7 DAY)`;
  } else {
    return `${dateColumn} >= date('now', '-7 days') AND ${dateColumn} <= date('now', '+7 days')`;
  }
};

/**
 * Get monthly date range for current month
 * 
 * @param {string} dateColumn - Column name containing the date
 * @returns {string} SQL WHERE clause for current month
 */
const getMonthlyDateRange = (dateColumn = 'created_at') => {
  if (getDbType() === 'mysql') {
    return `${dateColumn} >= DATE_FORMAT(CURDATE(), '%Y-%m-01') AND ${dateColumn} <= CURDATE()`;
  } else {
    return `${dateColumn} >= date('now', 'start of month') AND ${dateColumn} <= date('now')`;
  }
};

/**
 * Get future date comparison (for upcoming events)
 * 
 * @param {string} dateColumn - Column name containing the date
 * @returns {string} SQL WHERE clause for future dates
 */
const getFutureDateComparison = (dateColumn = 'date') => {
  return `${dateColumn} >= ${getCurrentDateFunction()}`;
};

/**
 * Get boolean value representation
 * 
 * @param {boolean} value - Boolean value to convert
 * @returns {number|boolean} Database-appropriate boolean value
 */
const getBooleanValue = (value) => {
  // Both MySQL and SQLite can handle 1/0 for booleans
  return value ? 1 : 0;
};

module.exports = {
  getDbType,
  getDatetimeFunction,
  getCurrentDateFunction,
  getDateSubtractFunction,
  getDateAddFunction,
  getConcatFunction,
  getWeeklyDateRange,
  getMonthlyDateRange,
  getFutureDateComparison,
  getBooleanValue
};

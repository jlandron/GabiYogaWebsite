/**
 * CloudWatch Logger Integration
 * 
 * Extends the base logging functionality to push logs to AWS CloudWatch.
 * Uses the AWS SDK to directly send log events to CloudWatch.
 */

const { CloudWatchLogs } = require('@aws-sdk/client-cloudwatch-logs');
const os = require('os');
const logger = require('./logger');

// Default CloudWatch configuration
const DEFAULT_LOG_GROUP = '/yoga-website/application';
const DEFAULT_RETENTION_DAYS = 14; // 2 weeks
const MAX_BATCH_SIZE = 10000; // CloudWatch batch size limit
const LOG_SEND_INTERVAL = 5000; // 5 seconds

// Load region from environment or use a default
const AWS_REGION = process.env.AWS_REGION || 'us-west-2';

// Queue for batching log events before sending to CloudWatch
let logEventsQueue = [];
let isSendingLogs = false;
let sendLogsTimer = null;

// Initialize CloudWatch Logs client
let cloudWatchLogsClient = null;
try {
  cloudWatchLogsClient = new CloudWatchLogs({
    region: AWS_REGION
  });
} catch (error) {
  logger.error('Failed to initialize CloudWatch Logs client', { error: error.message });
}

/**
 * Initialize the CloudWatch logging functionality
 * 
 * @param {Object} options - Configuration options
 * @param {string} options.logGroupName - CloudWatch Log Group name
 * @param {number} options.retentionDays - Log retention period in days
 * @returns {Promise<void>}
 */
async function initializeCloudWatchLogger(options = {}) {
  if (!cloudWatchLogsClient) {
    logger.warn('CloudWatch Logs client not initialized, logs will not be sent to CloudWatch');
    return;
  }

  const logGroupName = options.logGroupName || process.env.CLOUDWATCH_LOG_GROUP || DEFAULT_LOG_GROUP;
  const retentionDays = options.retentionDays || parseInt(process.env.CLOUDWATCH_RETENTION_DAYS, 10) || DEFAULT_RETENTION_DAYS;
  
  // Create log group if it doesn't exist
  try {
    await ensureLogGroupExists(logGroupName, retentionDays);
    logger.info(`CloudWatch logging initialized for log group: ${logGroupName}`);
    
    // Start the timer to periodically send logs
    startLogSender();
  } catch (error) {
    logger.error('Failed to initialize CloudWatch logging', { error: error.message }, error);
  }
}

/**
 * Ensure the CloudWatch log group exists, create it if it doesn't
 * 
 * @param {string} logGroupName - CloudWatch Log Group name
 * @param {number} retentionDays - Log retention period in days
 */
async function ensureLogGroupExists(logGroupName, retentionDays) {
  try {
    // Check if log group exists
    await cloudWatchLogsClient.describeLogGroups({
      logGroupNamePrefix: logGroupName,
      limit: 1
    });
    
    // If we get here, log group might exist, but we need to verify it's the exact one
    const response = await cloudWatchLogsClient.describeLogGroups({
      logGroupNamePattern: logGroupName,
    });
    
    const exists = response.logGroups && response.logGroups.some(group => group.logGroupName === logGroupName);
    
    if (!exists) {
      // Create the log group
      await cloudWatchLogsClient.createLogGroup({
        logGroupName
      });
      logger.info(`Created CloudWatch log group: ${logGroupName}`);
      
      // Set retention policy
      await cloudWatchLogsClient.putRetentionPolicy({
        logGroupName,
        retentionInDays: retentionDays
      });
      logger.info(`Set CloudWatch log retention to ${retentionDays} days`);
    } else {
      logger.info(`Using existing CloudWatch log group: ${logGroupName}`);
    }
  } catch (error) {
    // If error is not "ResourceNotFoundException", rethrow it
    if (error.name !== 'ResourceNotFoundException') {
      throw error;
    }
    
    // Create the log group
    await cloudWatchLogsClient.createLogGroup({
      logGroupName
    });
    logger.info(`Created CloudWatch log group: ${logGroupName}`);
    
    // Set retention policy
    await cloudWatchLogsClient.putRetentionPolicy({
      logGroupName,
      retentionInDays: retentionDays
    });
    logger.info(`Set CloudWatch log retention to ${retentionDays} days`);
  }
}

/**
 * Send logs to CloudWatch
 * 
 * @param {string} message - Log message
 * @param {Object} metadata - Additional metadata
 * @param {string} level - Log level
 */
function sendToCloudWatch(message, metadata = {}, level = 'INFO') {
  if (!cloudWatchLogsClient) {
    return;
  }
  
  const logGroupName = process.env.CLOUDWATCH_LOG_GROUP || DEFAULT_LOG_GROUP;
  const logStreamName = getLogStreamName();
  const timestamp = new Date().getTime();
  
  // Format the log message for CloudWatch
  let formattedMessage = `[${level}] ${message}`;
  
  if (Object.keys(metadata).length > 0) {
    try {
      formattedMessage += ' ' + JSON.stringify(metadata);
    } catch (err) {
      formattedMessage += ' [Metadata serialization failed]';
    }
  }
  
  // Add to queue
  logEventsQueue.push({
    timestamp,
    message: formattedMessage,
    logGroupName,
    logStreamName
  });
  
  // If we've accumulated enough logs or it's been a while, send them
  if (logEventsQueue.length >= MAX_BATCH_SIZE) {
    flushLogEvents();
  }
}

/**
 * Get the log stream name, using the hostname and date
 * 
 * @returns {string} Log stream name
 */
function getLogStreamName() {
  const hostname = os.hostname();
  const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  return `${hostname}/${date}`;
}

/**
 * Start the timer to send logs periodically
 */
function startLogSender() {
  if (sendLogsTimer) {
    clearInterval(sendLogsTimer);
  }
  
  sendLogsTimer = setInterval(() => {
    if (logEventsQueue.length > 0) {
      flushLogEvents();
    }
  }, LOG_SEND_INTERVAL);
  
  // Ensure the timer doesn't keep the process alive
  sendLogsTimer.unref();
}

/**
 * Send all queued logs to CloudWatch
 */
async function flushLogEvents() {
  if (isSendingLogs || logEventsQueue.length === 0 || !cloudWatchLogsClient) {
    return;
  }
  
  isSendingLogs = true;
  
  try {
    // Group logs by log group/stream
    const logGroups = {};
    
    // Clone and clear the queue
    const logsToSend = [...logEventsQueue];
    logEventsQueue = [];
    
    // Group logs by stream
    logsToSend.forEach(log => {
      const key = `${log.logGroupName}:${log.logStreamName}`;
      if (!logGroups[key]) {
        logGroups[key] = {
          logGroupName: log.logGroupName,
          logStreamName: log.logStreamName,
          logEvents: []
        };
      }
      
      logGroups[key].logEvents.push({
        timestamp: log.timestamp,
        message: log.message
      });
    });
    
    // Send each group of logs
    await Promise.all(Object.values(logGroups).map(async (group) => {
      // Ensure the log stream exists
      await ensureLogStreamExists(group.logGroupName, group.logStreamName);
      
      // Send logs in batches (CloudWatch limits to 10000 logs per batch)
      for (let i = 0; i < group.logEvents.length; i += MAX_BATCH_SIZE) {
        const batch = group.logEvents.slice(i, i + MAX_BATCH_SIZE);
        await sendLogBatch(group.logGroupName, group.logStreamName, batch);
      }
    }));
  } catch (error) {
    logger.error('Failed to send logs to CloudWatch', { error: error.message }, error);
    // Re-queue logs that failed to send
    logEventsQueue = [...logEventsQueue, ...logsToSend];
  } finally {
    isSendingLogs = false;
  }
}

/**
 * Ensure the log stream exists, create it if it doesn't
 * 
 * @param {string} logGroupName - CloudWatch Log Group name
 * @param {string} logStreamName - CloudWatch Log Stream name
 */
async function ensureLogStreamExists(logGroupName, logStreamName) {
  try {
    await cloudWatchLogsClient.createLogStream({
      logGroupName,
      logStreamName
    });
  } catch (error) {
    // If the stream already exists, that's fine
    if (error.name !== 'ResourceAlreadyExistsException') {
      throw error;
    }
  }
}

/**
 * Send a batch of logs to CloudWatch
 * 
 * @param {string} logGroupName - CloudWatch Log Group name
 * @param {string} logStreamName - CloudWatch Log Stream name
 * @param {Array} logEvents - Array of log events to send
 */
async function sendLogBatch(logGroupName, logStreamName, logEvents) {
  try {
    // Sort logs by timestamp
    logEvents.sort((a, b) => a.timestamp - b.timestamp);
    
    // Get the next sequence token
    let sequenceToken;
    try {

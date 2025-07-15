/**
 * Email Service for Gabi Yoga
 * Handles sending transactional emails using AWS WorkMail SMTP
 */

const nodemailer = require('nodemailer');
const { getSmtpCredentials } = require('./aws-secrets');
const templates = require('./email-templates');

// Default sender address
const DEFAULT_FROM = process.env.FROM_EMAIL || 'noreply@gabi.yoga';

// Cache for the transporter to avoid recreating it on every email
let transporterCache = null;
let transporterCacheExpiry = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Base URL for links in emails
const getBaseUrl = () => {
  const stage = process.env.STAGE || 'dev';
  if (stage === 'prod') {
    return 'https://gabi.yoga';
  }
  return 'https://dev.gabi.yoga';
};

/**
 * Format a date and time string for display in emails
 * @param {string} dateStr - Date string in YYYY-MM-DD format
 * @param {string} timeStr - Time string in HH:MM:SS format
 * @returns {string} - Formatted date and time string
 */
function formatDateTimeString(dateStr, timeStr) {
  if (!dateStr) return 'N/A';
  
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return 'N/A';
  
  const options = { 
    weekday: 'long',
    year: 'numeric', 
    month: 'long', 
    day: 'numeric',
  };
  
  let formattedString = date.toLocaleDateString('en-US', options);
  
  if (timeStr) {
    // Convert 24h time format to 12h format
    const timeParts = timeStr.split(':');
    if (timeParts.length >= 2) {
      const hours = parseInt(timeParts[0]);
      const minutes = timeParts[1];
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const displayHours = hours % 12 || 12; // Convert 0 to 12 for 12 AM
      formattedString += ` at ${displayHours}:${minutes} ${ampm}`;
    }
  }
  
  return formattedString;
}

/**
 * Get or create a nodemailer transporter for WorkMail SMTP
 * Uses caching to avoid recreating the transporter on every email
 * @returns {Promise<Object>} - Nodemailer transporter object
 */
async function getTransporter() {
  const now = Date.now();
  
  // Return cached transporter if still valid
  if (transporterCache && now < transporterCacheExpiry) {
    return transporterCache;
  }
  
  try {
    let emailConfig;
    
    // Try to get credentials from SSM + environment variables first
    if (process.env.USE_ENV_ONLY !== 'true') {
      try {
        emailConfig = await getSmtpCredentials();
        console.log('Using SMTP credentials from SSM Parameter Store + Environment Variables');
      } catch (error) {
        console.log('Failed to get credentials from SSM, falling back to environment variables only:', error.message);
        emailConfig = getEnvCredentials();
      }
    } else {
      emailConfig = getEnvCredentials();
      console.log('Using SMTP credentials from environment variables only');
    }
    
    // Create nodemailer transporter
    const transporter = nodemailer.createTransport({
      host: emailConfig.host,
      port: emailConfig.port,
      secure: emailConfig.secure,
      auth: {
        user: emailConfig.username,
        pass: emailConfig.password
      }
    });
    
    // Verify the configuration
    await transporter.verify();
    
    // Cache the transporter
    transporterCache = transporter;
    transporterCacheExpiry = now + CACHE_DURATION;
    
    console.log('WorkMail SMTP transporter created and verified successfully');
    return transporter;
    
  } catch (error) {
    console.error('Error creating WorkMail transporter:', error);
    throw new Error(`Failed to create email transporter: ${error.message}`);
  }
}

/**
 * Get SMTP credentials from environment variables only (fallback)
 * @returns {Object} SMTP configuration object
 */
function getEnvCredentials() {
  const region = process.env.AWS_REGION || 'us-east-1';
  
  const config = {
    host: process.env.SMTP_HOST || `smtp.mail.${region}.awsapps.com`,
    port: parseInt(process.env.SMTP_PORT || '465', 10),
    secure: process.env.SMTP_SECURE !== 'false', // Default to true for SSL
    username: process.env.SMTP_USER || DEFAULT_FROM,
    password: process.env.SMTP_PASS
  };
  
  console.log('Environment credentials:', {
    host: config.host,
    port: config.port,
    secure: config.secure,
    username: config.username,
    passwordSet: !!config.password,
    passwordLength: config.password ? config.password.length : 0
  });
  
  return config;
}

/**
 * Send an email using WorkMail SMTP via nodemailer
 * @param {Object} mailOptions - Nodemailer mail options
 * @returns {Promise} - Email sending promise
 */
async function sendEmail(mailOptions) {
  try {
    const transporter = await getTransporter();
    const result = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully via WorkMail:', result.messageId);
    return result;
  } catch (error) {
    console.error('Error sending email via WorkMail:', error);
    throw error;
  }
}

/**
 * Check if user has opted in for a specific email type
 * @param {Object} user - User object with preferences
 * @param {string} emailType - Type of email: 'newsletter', 'notifications', or 'transactional'
 * @returns {boolean} - Whether user wants to receive this type of email
 */
function shouldSendEmail(user, emailType) {
  // Transactional emails (password reset, etc.) are always sent
  if (emailType === 'transactional') {
    return true;
  }
  
  // Check user preferences
  if (!user || !user.preferences) {
    // If no preferences set, default to true for notifications, false for newsletter
    return emailType === 'notifications';
  }
  
  return user.preferences[emailType] === true;
}

/**
 * Send a password reset email (ALWAYS sent - transactional)
 * @param {string} email - Recipient email address
 * @param {string} firstName - Recipient's first name
 * @param {string} resetToken - Password reset token
 * @returns {Promise} - Email sending promise
 */
exports.sendPasswordResetEmail = async (email, firstName, resetToken) => {
  // Password reset emails are always sent regardless of preferences (transactional)
  const baseUrl = getBaseUrl();
  const resetUrl = `${baseUrl}/reset-password.html?token=${resetToken}`;
  
  const mailOptions = {
    from: DEFAULT_FROM,
    to: email,
    subject: templates.passwordResetTemplate.subject,
    html: templates.passwordResetTemplate.htmlContent(firstName, resetUrl)
              .replace('{{email}}', email)
              .replace('{{baseUrl}}', baseUrl),
    text: templates.passwordResetTemplate.textContent(firstName, resetUrl)
  };

  return sendEmail(mailOptions);
};

/**
 * Send a booking confirmation email (notification type)
 * @param {Object} user - User object with preferences
 * @param {Object} booking - Booking details
 * @returns {Promise} - Email sending promise or null if user opted out
 */
exports.sendBookingConfirmationEmail = async (user, booking) => {
  // Check if user wants notification emails
  if (!shouldSendEmail(user, 'notifications')) {
    console.log(`User ${user.email} has opted out of notification emails, skipping booking confirmation`);
    return null;
  }
  
  const baseUrl = getBaseUrl();
  
  // Format date and time for display
  const classDate = formatDateTimeString(booking.date, booking.time);
  
  const mailOptions = {
    from: DEFAULT_FROM,
    to: user.email,
    subject: templates.bookingConfirmationTemplate.subject,
    html: templates.bookingConfirmationTemplate.htmlContent(user.firstName, booking, classDate)
              .replace('{{baseUrl}}', baseUrl)
              .replace('{{email}}', user.email),
    text: templates.bookingConfirmationTemplate.textContent(user.firstName, booking, classDate, baseUrl)
  };

  return sendEmail(mailOptions);
};

/**
 * Send a class cancellation email (notification type)
 * @param {Object} user - User object with preferences
 * @param {Object} classInfo - Class information
 * @returns {Promise} - Email sending promise or null if user opted out
 */
exports.sendClassCancellationEmail = async (user, classInfo) => {
  // Check if user wants notification emails
  if (!shouldSendEmail(user, 'notifications')) {
    console.log(`User ${user.email} has opted out of notification emails, skipping class cancellation`);
    return null;
  }
  
  const baseUrl = getBaseUrl();
  
  // Format date and time for display
  const classDate = formatDateTimeString(classInfo.scheduleDate, classInfo.startTime);
  
  const mailOptions = {
    from: DEFAULT_FROM,
    to: user.email,
    subject: templates.classCancellationTemplate.subject,
    html: templates.classCancellationTemplate.htmlContent(user.firstName, classInfo, classDate)
              .replace('{{baseUrl}}', baseUrl)
              .replace('{{email}}', user.email),
    text: templates.classCancellationTemplate.textContent(user.firstName, classInfo, classDate, baseUrl)
  };

  return sendEmail(mailOptions);
};

/**
 * Send a forgot password email safely
 * Will not throw an error if the email is not found or if sending fails
 * This prevents enumeration attacks by not revealing if an email exists in the system
 * @param {string} email - Recipient email address
 * @param {Object|null} user - User object if found, null if not found
 * @returns {Promise<boolean>} - Returns true if email was sent, false if not
 */
exports.sendForgotPasswordEmailSafely = async (email, user) => {
  try {
    // If no user was found with this email, we still pretend we sent the email
    if (!user) {
      console.log(`No user found with email ${email}, skipping password reset email`);
      return false;
    }

    // Generate a reset token (should be done by the auth service)
    const resetToken = user.resetToken || 'dummy-token';
    
    // Send the actual email
    await exports.sendPasswordResetEmail(email, user.firstName, resetToken);
    return true;
  } catch (error) {
    // Log the error but don't throw it to the caller
    console.error('Error in sendForgotPasswordEmailSafely:', error);
    return false;
  }
};

/**
 * Send class cancellation emails to all registered users
 * @param {Object} classInfo - Class information
 * @param {Array<Object>} registeredUsers - List of users registered for the class
 * @returns {Promise<Object>} - Results of the send operation
 */
exports.sendClassCancellationEmailsToAll = async (classInfo, registeredUsers) => {
  const results = {
    success: 0,
    failed: 0,
    skipped: 0,
    errors: []
  };

  // Send emails in parallel with a concurrency limit to avoid throttling
  const concurrencyLimit = 10;
  const batches = [];
  
  // Split users into batches
  for (let i = 0; i < registeredUsers.length; i += concurrencyLimit) {
    batches.push(registeredUsers.slice(i, i + concurrencyLimit));
  }
  
  // Process each batch sequentially
  for (const batch of batches) {
    try {
      // Process users in a batch concurrently
      const promises = batch.map(user => 
        exports.sendClassCancellationEmail(user, classInfo)
          .then((result) => { 
            if (result === null) {
              results.skipped += 1; // User opted out
            } else {
              results.success += 1; 
            }
          })
          .catch(error => {
            results.failed += 1;
            results.errors.push({ email: user.email, error: error.message });
          })
      );
      
      await Promise.all(promises);
      
      // Add a short delay between batches to avoid throttling
      if (batches.indexOf(batch) < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error) {
      console.error('Error processing batch:', error);
    }
  }
  
  return results;
};

/**
 * Check WorkMail SMTP service status
 * This can be used to verify that WorkMail SMTP is configured correctly
 * @returns {Promise<Object>} - WorkMail SMTP status information
 */
exports.checkWorkMailStatus = async () => {
  try {
    const transporter = await getTransporter();
    
    // Test the connection
    const isVerified = await transporter.verify();
    
    let credentialsSource = 'Environment Variables';
    if (process.env.USE_ENV_CREDENTIALS !== 'true') {
      try {
        await getSmtpCredentials();
        credentialsSource = 'AWS Secrets Manager';
      } catch (error) {
        // Already falls back to env variables
      }
    }
    
    const envCredentials = getEnvCredentials();
    
    return {
      connectionVerified: isVerified,
      credentialsSource,
      smtpHost: envCredentials.host,
      smtpPort: envCredentials.port,
      smtpSecure: envCredentials.secure,
      fromEmail: DEFAULT_FROM,
      region: process.env.AWS_REGION || 'us-east-1'
    };
  } catch (error) {
    console.error('Error checking WorkMail SMTP status:', error);
    throw error;
  }
};

/**
 * Test email sending functionality
 * Sends a test email to verify WorkMail configuration
 * @param {string} testEmail - Email address to send test email to
 * @returns {Promise<Object>} - Test results
 */
exports.testEmailSending = async (testEmail) => {
  try {
    const testMailOptions = {
      from: DEFAULT_FROM,
      to: testEmail,
      subject: 'Gabi Yoga - WorkMail Test Email',
      html: `
        <h2>WorkMail Test Successful</h2>
        <p>This is a test email from the Gabi Yoga website using AWS WorkMail SMTP.</p>
        <p>If you're receiving this, your WorkMail configuration is working correctly! 🎉</p>
        <p>Timestamp: ${new Date().toISOString()}</p>
      `,
      text: `WorkMail Test Successful\n\nThis is a test email from the Gabi Yoga website using AWS WorkMail SMTP.\nIf you're receiving this, your WorkMail configuration is working correctly!\n\nTimestamp: ${new Date().toISOString()}`
    };
    
    const result = await sendEmail(testMailOptions);
    
    return {
      success: true,
      messageId: result.messageId,
      message: 'Test email sent successfully via WorkMail SMTP'
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      message: 'Failed to send test email via WorkMail SMTP'
    };
  }
};

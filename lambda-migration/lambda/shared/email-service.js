/**
 * Email Service for Gabi Yoga
 * Handles sending transactional emails using AWS SES
 */

const AWS = require('aws-sdk');
const templates = require('./email-templates');

// Configure the AWS region
AWS.config.update({ region: process.env.AWS_REGION || 'us-east-1' });

// Create SES service object
const ses = new AWS.SES({ apiVersion: '2010-12-01' });

// Default sender address (should be a verified email in SES)
const DEFAULT_FROM = process.env.FROM_EMAIL || 'noreply@gabi.yoga';

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
 * Send an email using Amazon SES
 * @param {Object} params - Email parameters
 * @returns {Promise} - SES send email promise
 */
async function sendEmail(params) {
  try {
    const result = await ses.sendEmail(params).promise();
    console.log('Email sent successfully:', result.MessageId);
    return result;
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
}

/**
 * Send a password reset email
 * @param {string} email - Recipient email address
 * @param {string} firstName - Recipient's first name
 * @param {string} resetToken - Password reset token
 * @returns {Promise} - Email sending promise
 */
exports.sendPasswordResetEmail = async (email, firstName, resetToken) => {
  const baseUrl = getBaseUrl();
  const resetUrl = `${baseUrl}/reset-password.html?token=${resetToken}`;
  
  const params = {
    Source: DEFAULT_FROM,
    Destination: {
      ToAddresses: [email],
    },
    Message: {
      Subject: {
        Data: templates.passwordResetTemplate.subject,
        Charset: 'UTF-8',
      },
      Body: {
        Html: {
          Data: templates.passwordResetTemplate.htmlContent(firstName, resetUrl).replace('{{email}}', email),
          Charset: 'UTF-8',
        },
        Text: {
          Data: templates.passwordResetTemplate.textContent(firstName, resetUrl),
          Charset: 'UTF-8',
        },
      },
    },
  };

  return sendEmail(params);
};

/**
 * Send a booking confirmation email
 * @param {string} email - Recipient email address
 * @param {string} firstName - Recipient's first name
 * @param {Object} booking - Booking details
 * @returns {Promise} - Email sending promise
 */
exports.sendBookingConfirmationEmail = async (email, firstName, booking) => {
  const baseUrl = getBaseUrl();
  
  // Format date and time for display
  const classDate = formatDateTimeString(booking.date, booking.time);
  
  const params = {
    Source: DEFAULT_FROM,
    Destination: {
      ToAddresses: [email],
    },
    Message: {
      Subject: {
        Data: templates.bookingConfirmationTemplate.subject,
        Charset: 'UTF-8',
      },
      Body: {
        Html: {
          Data: templates.bookingConfirmationTemplate.htmlContent(firstName, booking, classDate)
                    .replace('{{baseUrl}}', baseUrl)
                    .replace('{{email}}', email),
          Charset: 'UTF-8',
        },
        Text: {
          Data: templates.bookingConfirmationTemplate.textContent(firstName, booking, classDate, baseUrl),
          Charset: 'UTF-8',
        },
      },
    },
  };

  return sendEmail(params);
};

/**
 * Send a class cancellation email
 * @param {string} email - Recipient email address
 * @param {string} firstName - Recipient's first name
 * @param {Object} classInfo - Class information
 * @returns {Promise} - Email sending promise
 */
exports.sendClassCancellationEmail = async (email, firstName, classInfo) => {
  const baseUrl = getBaseUrl();
  
  // Format date and time for display
  const classDate = formatDateTimeString(classInfo.scheduleDate, classInfo.startTime);
  
  const params = {
    Source: DEFAULT_FROM,
    Destination: {
      ToAddresses: [email],
    },
    Message: {
      Subject: {
        Data: templates.classCancellationTemplate.subject,
        Charset: 'UTF-8',
      },
      Body: {
        Html: {
          Data: templates.classCancellationTemplate.htmlContent(firstName, classInfo, classDate)
                    .replace('{{baseUrl}}', baseUrl)
                    .replace('{{email}}', email),
          Charset: 'UTF-8',
        },
        Text: {
          Data: templates.classCancellationTemplate.textContent(firstName, classInfo, classDate, baseUrl),
          Charset: 'UTF-8',
        },
      },
    },
  };

  return sendEmail(params);
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
        exports.sendClassCancellationEmail(user.email, user.firstName, classInfo)
          .then(() => { results.success += 1; })
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
 * Check SES service status
 * This can be used to verify that SES is configured correctly
 * @returns {Promise<Object>} - SES account information
 */
exports.checkSESStatus = async () => {
  try {
    const accountStatus = await ses.getAccountSendingEnabled().promise();
    const sendQuota = await ses.getSendQuota().promise();
    const identities = await ses.listIdentities({ IdentityType: 'Domain' }).promise();
    
    return {
      sendingEnabled: accountStatus.Enabled,
      sendQuota,
      identities: identities.Identities,
      sandboxMode: sendQuota.MaxSendRate < 10 // Rough estimate of sandbox mode
    };
  } catch (error) {
    console.error('Error checking SES status:', error);
    throw error;
  }
};

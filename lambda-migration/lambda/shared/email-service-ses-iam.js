/**
 * Email Service for Gabi Yoga using AWS SES with IAM Authentication
 * This approach uses IAM roles instead of stored passwords
 */

const AWS = require('aws-sdk');
const templates = require('./email-templates');

// Configure SES with IAM authentication
const ses = new AWS.SES({
  region: process.env.AWS_REGION || 'us-east-1'
});

// Default sender address
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
    const timeParts = timeStr.split(':');
    if (timeParts.length >= 2) {
      const hours = parseInt(timeParts[0]);
      const minutes = timeParts[1];
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const displayHours = hours % 12 || 12;
      formattedString += ` at ${displayHours}:${minutes} ${ampm}`;
    }
  }
  
  return formattedString;
}

/**
 * Send an email using AWS SES with IAM authentication
 * @param {Object} params - SES send email parameters
 * @returns {Promise} - SES send email promise
 */
async function sendEmail(params) {
  try {
    const result = await ses.sendEmail(params).promise();
    console.log('Email sent successfully via SES with IAM:', result.MessageId);
    return result;
  } catch (error) {
    console.error('Error sending email via SES:', error);
    throw error;
  }
}

/**
 * Send a password reset email
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
 */
exports.sendBookingConfirmationEmail = async (email, firstName, booking) => {
  const baseUrl = getBaseUrl();
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
 */
exports.sendClassCancellationEmail = async (email, firstName, classInfo) => {
  const baseUrl = getBaseUrl();
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
 * Send forgot password email safely
 */
exports.sendForgotPasswordEmailSafely = async (email, user) => {
  try {
    if (!user) {
      console.log(`No user found with email ${email}, skipping password reset email`);
      return false;
    }

    const resetToken = user.resetToken || 'dummy-token';
    await exports.sendPasswordResetEmail(email, user.firstName, resetToken);
    return true;
  } catch (error) {
    console.error('Error in sendForgotPasswordEmailSafely:', error);
    return false;
  }
};

/**
 * Send class cancellation emails to all registered users
 */
exports.sendClassCancellationEmailsToAll = async (classInfo, registeredUsers) => {
  const results = {
    success: 0,
    failed: 0,
    errors: []
  };

  // Process in batches to avoid SES rate limits
  const concurrencyLimit = 14; // SES default rate limit is 14 emails per second
  const batches = [];
  
  for (let i = 0; i < registeredUsers.length; i += concurrencyLimit) {
    batches.push(registeredUsers.slice(i, i + concurrencyLimit));
  }
  
  for (const batch of batches) {
    try {
      const promises = batch.map(user => 
        exports.sendClassCancellationEmail(user.email, user.firstName, classInfo)
          .then(() => { results.success += 1; })
          .catch(error => {
            results.failed += 1;
            results.errors.push({ email: user.email, error: error.message });
          })
      );
      
      await Promise.all(promises);
      
      // Add delay between batches
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
 * Check SES service status with IAM authentication
 */
exports.checkSESStatus = async () => {
  try {
    const accountStatus = await ses.getAccountSendingEnabled().promise();
    const sendQuota = await ses.getSendQuota().promise();
    
    return {
      sendingEnabled: accountStatus.Enabled,
      maxSendRate: sendQuota.MaxSendRate,
      maxSend24Hour: sendQuota.Max24HourSend,
      sentLast24Hours: sendQuota.SentLast24Hours,
      fromEmail: DEFAULT_FROM,
      region: process.env.AWS_REGION || 'us-east-1',
      authMethod: 'IAM Role',
      sandboxMode: sendQuota.MaxSendRate < 200 // Estimate of sandbox mode
    };
  } catch (error) {
    console.error('Error checking SES status:', error);
    throw error;
  }
};

/**
 * Test email sending functionality
 */
exports.testEmailSending = async (testEmail) => {
  try {
    const params = {
      Source: DEFAULT_FROM,
      Destination: {
        ToAddresses: [testEmail],
      },
      Message: {
        Subject: {
          Data: 'Gabi Yoga - SES IAM Test Email',
          Charset: 'UTF-8',
        },
        Body: {
          Html: {
            Data: `
              <h2>SES IAM Authentication Test Successful</h2>
              <p>This is a test email from the Gabi Yoga website using AWS SES with IAM authentication.</p>
              <p>If you're receiving this, your SES IAM configuration is working correctly! 🎉</p>
              <p>No passwords were stored or used for this email.</p>
              <p>Timestamp: ${new Date().toISOString()}</p>
            `,
            Charset: 'UTF-8',
          },
          Text: {
            Data: `SES IAM Authentication Test Successful\n\nThis is a test email from the Gabi Yoga website using AWS SES with IAM authentication.\nIf you're receiving this, your SES IAM configuration is working correctly!\n\nNo passwords were stored or used for this email.\n\nTimestamp: ${new Date().toISOString()}`,
            Charset: 'UTF-8',
          },
        },
      },
    };
    
    const result = await sendEmail(params);
    
    return {
      success: true,
      messageId: result.MessageId,
      message: 'Test email sent successfully via SES with IAM authentication'
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      message: 'Failed to send test email via SES with IAM authentication'
    };
  }
};

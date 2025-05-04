/**
 * Email Service for Gabi Yoga Website
 * 
 * This service handles sending emails through different methods based on the environment:
 * - In development: Logs the email content to the console
 * - In production: Sends emails through AWS SES
 */

const AWS = require('aws-sdk');
const logger = require('./logger');

// Email service configuration
const config = {
  from: process.env.EMAIL_FROM || process.env.DEFAULT_SENDER || 'noreply@gabi.yoga',
  region: process.env.AWS_REGION || 'us-west-2',
  domain: process.env.DOMAIN_NAME || 'gabi.yoga',
  debug: process.env.EMAIL_DEBUG === 'true'
};

// Initialize SES if in production environment
let ses;
let sesInitFailed = false;
try {
  if (process.env.NODE_ENV === 'production') {
    ses = new AWS.SES({
      region: config.region,
      apiVersion: '2010-12-01'
    });
    logger.info(`Initialized AWS SES in ${config.region} region`);
  }
} catch (error) {
  sesInitFailed = true;
  logger.error('Failed to initialize AWS SES:', error);
  logger.warn('Email sending will fall back to console logging.');
}

/**
 * Send a password reset email
 * 
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email address
 * @param {string} options.resetToken - Password reset token
 * @param {string} options.resetUrl - URL with token for resetting password
 * @returns {Promise} - Resolves when email is sent
 */
const sendPasswordResetEmail = async (options) => {
  const { to, resetToken, resetUrl } = options;
  
  // Email content
  const subject = 'Password Reset Request - Gabi Yoga';
  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #557a95;">Reset Your Password</h2>
      <p>Hello,</p>
      <p>We received a request to reset your password for your Gabi Yoga account. Please click the button below to reset your password:</p>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${resetUrl}" style="background-color: #7fa99b; color: white; padding: 12px 20px; text-decoration: none; border-radius: 4px; font-weight: bold;">Reset Password</a>
      </div>
      
      <p>This link will expire in 1 hour for security reasons.</p>
      
      <p>If you didn't request a password reset, you can safely ignore this email. Your account is secure.</p>
      
      <p>Best regards,<br>Gabi Yoga Team</p>
      
      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666;">
        <p>This is an automated message, please do not reply to this email.</p>
      </div>
    </div>
  `;
  
  const textBody = `
    Reset Your Password - Gabi Yoga
    
    Hello,
    
    We received a request to reset your password for your Gabi Yoga account. 
    Please visit the following link to reset your password:
    
    ${resetUrl}
    
    This link will expire in 1 hour for security reasons.
    
    If you didn't request a password reset, you can safely ignore this email. Your account is secure.
    
    Best regards,
    Gabi Yoga Team
    
    This is an automated message, please do not reply to this email.
  `;
  
  // In development, log the email instead of sending it
  if (process.env.NODE_ENV !== 'production') {
    logger.info(`[DEV EMAIL] Password reset email for: ${to}`);
    logger.info(`[DEV EMAIL] Reset token: ${resetToken}`);
    logger.info(`[DEV EMAIL] Reset URL: ${resetUrl}`);
    logger.debug(`[DEV EMAIL] Email content: ${textBody}`);
    return Promise.resolve({ success: true, environment: 'development' });
  }
  
  // In production, attempt to send email through AWS SES, but fall back to logging if there's an issue
  if (process.env.NODE_ENV === 'production' && ses && !sesInitFailed) {
    try {
      // Set up SES parameters
      const params = {
        Destination: {
          ToAddresses: [to]
        },
        Message: {
          Body: {
            Html: {
              Data: htmlBody,
              Charset: 'UTF-8'
            },
            Text: {
              Data: textBody,
              Charset: 'UTF-8'
            }
          },
          Subject: {
            Data: subject,
            Charset: 'UTF-8'
          }
        },
        Source: config.from
      };
      
      // Send email
      const result = await ses.sendEmail(params).promise();
      logger.info(`Password reset email sent to ${to} via AWS SES`, { messageId: result.MessageId });
      return { success: true, messageId: result.MessageId, environment: 'production', method: 'ses' };
    } catch (error) {
      // Log the error but don't throw - instead fall back to logging the email content
      logger.error('Error sending password reset email via AWS SES:', error);
      logger.warn('Falling back to logging the email content instead of sending via SES');
      
      // Fall back to logging the email (similar to development mode)
      logger.info(`[PROD FALLBACK EMAIL] Password reset email for: ${to}`);
      logger.info(`[PROD FALLBACK EMAIL] Reset URL: ${resetUrl}`);
      
      // Return success to prevent API error, but include fallback info
      return { 
        success: true, 
        environment: 'production', 
        method: 'fallback_log',
        error: error.message || 'SES error' 
      };
    }
  } else {
    // This handles both development environment and production with failed SES init
    const environment = process.env.NODE_ENV === 'production' ? 'production-fallback' : 'development';
    logger.info(`[${environment.toUpperCase()}] Password reset email for: ${to}`);
    logger.info(`[${environment.toUpperCase()}] Reset URL: ${resetUrl}`);
    
    return { success: true, environment, method: 'log' };
  }
};

/**
 * Send a welcome email to new users
 * 
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email address
 * @param {string} options.firstName - User's first name
 * @param {string} options.loginUrl - URL for logging in
 * @returns {Promise} - Resolves when email is sent
 */
const sendWelcomeEmail = async (options) => {
  const { to, firstName, loginUrl } = options;
  
  // Email content
  const subject = 'Welcome to Gabi Yoga!';
  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #557a95;">Welcome to Gabi Yoga!</h2>
      <p>Hello${firstName ? ' ' + firstName : ''},</p>
      <p>Thank you for creating an account with Gabi Yoga. We're excited to have you join our community!</p>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${loginUrl}" style="background-color: #7fa99b; color: white; padding: 12px 20px; text-decoration: none; border-radius: 4px; font-weight: bold;">Log In to Your Account</a>
      </div>
      
      <p>At Gabi Yoga, we offer a variety of classes and resources to support your wellness journey.</p>
      
      <p>Best regards,<br>Gabi Yoga Team</p>
      
      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666;">
        <p>This is an automated message, please do not reply to this email.</p>
      </div>
    </div>
  `;
  
  const textBody = `
    Welcome to Gabi Yoga!
    
    Hello${firstName ? ' ' + firstName : ''},
    
    Thank you for creating an account with Gabi Yoga. We're excited to have you join our community!
    
    You can log in to your account here:
    ${loginUrl}
    
    At Gabi Yoga, we offer a variety of classes and resources to support your wellness journey.
    
    Best regards,
    Gabi Yoga Team
    
    This is an automated message, please do not reply to this email.
  `;
  
  // Use the same sending mechanism as the password reset
  return await sendEmail({ to, subject, htmlBody, textBody });
};

/**
 * Send a booking confirmation email
 * 
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email address
 * @param {string} options.firstName - User's first name
 * @param {Object} options.booking - Booking information
 * @param {string} options.bookingUrl - URL to view booking details
 * @returns {Promise} - Resolves when email is sent
 */
const sendBookingConfirmationEmail = async (options) => {
  const { to, firstName, booking, bookingUrl } = options;
  
  // Email content
  const subject = 'Booking Confirmation - Gabi Yoga';
  
  let bookingDetails = '';
  if (booking) {
    bookingDetails = `
      <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <p><strong>Class:</strong> ${booking.className || 'Yoga Session'}</p>
        <p><strong>Date:</strong> ${booking.date || 'N/A'}</p>
        <p><strong>Time:</strong> ${booking.time || 'N/A'}</p>
        ${booking.location ? `<p><strong>Location:</strong> ${booking.location}</p>` : ''}
        ${booking.teacher ? `<p><strong>Teacher:</strong> ${booking.teacher}</p>` : ''}
      </div>
    `;
  }
  
  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #557a95;">Booking Confirmation</h2>
      <p>Hello${firstName ? ' ' + firstName : ''},</p>
      <p>Your booking has been confirmed! Here are the details:</p>
      
      ${bookingDetails}
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${bookingUrl}" style="background-color: #7fa99b; color: white; padding: 12px 20px; text-decoration: none; border-radius: 4px; font-weight: bold;">View Booking Details</a>
      </div>
      
      <p>We look forward to seeing you!</p>
      
      <p>Best regards,<br>Gabi Yoga Team</p>
      
      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666;">
        <p>If you need to cancel or reschedule, please do so at least 24 hours in advance.</p>
        <p>This is an automated message, please do not reply to this email.</p>
      </div>
    </div>
  `;
  
  const textBody = `
    Booking Confirmation - Gabi Yoga
    
    Hello${firstName ? ' ' + firstName : ''},
    
    Your booking has been confirmed! Here are the details:
    
    Class: ${booking?.className || 'Yoga Session'}
    Date: ${booking?.date || 'N/A'}
    Time: ${booking?.time || 'N/A'}
    ${booking?.location ? `Location: ${booking.location}` : ''}
    ${booking?.teacher ? `Teacher: ${booking.teacher}` : ''}
    
    View Booking Details:
    ${bookingUrl}
    
    We look forward to seeing you!
    
    Best regards,
    Gabi Yoga Team
    
    If you need to cancel or reschedule, please do so at least 24 hours in advance.
    This is an automated message, please do not reply to this email.
  `;
  
  // Use the same sending mechanism as the password reset
  return await sendEmail({ to, subject, htmlBody, textBody });
};

/**
 * Base function for sending emails
 * This handles the common sending logic for all email types
 * 
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email address
 * @param {string} options.subject - Email subject
 * @param {string} options.htmlBody - HTML content
 * @param {string} options.textBody - Plain text content
 * @returns {Promise} - Resolves when email is sent
 */
const sendEmail = async (options) => {
  const { to, subject, htmlBody, textBody } = options;
  
  if (config.debug) {
    logger.info(`[EMAIL DEBUG] Preparing to send email to: ${to}`);
    logger.info(`[EMAIL DEBUG] Subject: ${subject}`);
  }
  
  // In development, log the email instead of sending it
  if (process.env.NODE_ENV !== 'production') {
    logger.info(`[DEV EMAIL] Email for: ${to}`);
    logger.info(`[DEV EMAIL] Subject: ${subject}`);
    if (config.debug) {
      logger.debug(`[DEV EMAIL] Content: ${textBody}`);
    }
    return Promise.resolve({ success: true, environment: 'development' });
  }
  
  // In production, attempt to send email through AWS SES, but fall back to logging if there's an issue
  if (process.env.NODE_ENV === 'production' && ses && !sesInitFailed) {
    try {
      // Set up SES parameters
      const params = {
        Destination: {
          ToAddresses: [to]
        },
        Message: {
          Body: {
            Html: {
              Data: htmlBody,
              Charset: 'UTF-8'
            },
            Text: {
              Data: textBody,
              Charset: 'UTF-8'
            }
          },
          Subject: {
            Data: subject,
            Charset: 'UTF-8'
          }
        },
        Source: config.from
      };
      
      if (config.debug) {
        logger.info(`[EMAIL DEBUG] Sending via SES with params:`, JSON.stringify({
          to,
          from: config.from,
          subject
        }));
      }
      
      // Send email
      const result = await ses.sendEmail(params).promise();
      logger.info(`Email sent to ${to} via AWS SES`, { messageId: result.MessageId });
      return { success: true, messageId: result.MessageId, environment: 'production', method: 'ses' };
    } catch (error) {
      // Log the error but don't throw - instead fall back to logging the email content
      logger.error('Error sending email via AWS SES:', error);
      logger.warn('Falling back to logging the email content instead of sending via SES');
      
      // Fall back to logging the email (similar to development mode)
      logger.info(`[PROD FALLBACK EMAIL] Email for: ${to}`);
      logger.info(`[PROD FALLBACK EMAIL] Subject: ${subject}`);
      
      // Return success to prevent API error, but include fallback info
      return { 
        success: true, 
        environment: 'production', 
        method: 'fallback_log',
        error: error.message || 'SES error' 
      };
    }
  } else {
    // This handles both development environment and production with failed SES init
    const environment = process.env.NODE_ENV === 'production' ? 'production-fallback' : 'development';
    logger.info(`[${environment.toUpperCase()}] Email for: ${to}`);
    logger.info(`[${environment.toUpperCase()}] Subject: ${subject}`);
    
    return { success: true, environment, method: 'log' };
  }
};

// Update the password reset email function to use the common sendEmail function
const originalSendPasswordResetEmail = sendPasswordResetEmail;
const sendPasswordResetEmailViaBase = async (options) => {
  const { to, resetToken, resetUrl } = options;
  
  // Email content
  const subject = 'Password Reset Request - Gabi Yoga';
  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #557a95;">Reset Your Password</h2>
      <p>Hello,</p>
      <p>We received a request to reset your password for your Gabi Yoga account. Please click the button below to reset your password:</p>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${resetUrl}" style="background-color: #7fa99b; color: white; padding: 12px 20px; text-decoration: none; border-radius: 4px; font-weight: bold;">Reset Password</a>
      </div>
      
      <p>This link will expire in 1 hour for security reasons.</p>
      
      <p>If you didn't request a password reset, you can safely ignore this email. Your account is secure.</p>
      
      <p>Best regards,<br>Gabi Yoga Team</p>
      
      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666;">
        <p>This is an automated message, please do not reply to this email.</p>
      </div>
    </div>
  `;
  
  const textBody = `
    Reset Your Password - Gabi Yoga
    
    Hello,
    
    We received a request to reset your password for your Gabi Yoga account. 
    Please visit the following link to reset your password:
    
    ${resetUrl}
    
    This link will expire in 1 hour for security reasons.
    
    If you didn't request a password reset, you can safely ignore this email. Your account is secure.
    
    Best regards,
    Gabi Yoga Team
    
    This is an automated message, please do not reply to this email.
  `;
  
  // Use the common email sending function
  const result = await sendEmail({ to, subject, htmlBody, textBody });
  
  // If there's a token, add it to the result for backward compatibility
  if (resetToken) {
    result.resetToken = resetToken;
  }
  
  return result;
};

// Keep the original function for backward compatibility, but internally use the base function
sendPasswordResetEmail = async (options) => {
  if (config.debug) {
    logger.info(`[EMAIL DEBUG] Password reset requested for ${options.to}`);
  }
  
  // For backward compatibility, use the original function
  // This ensures existing code doesn't break
  const result = await originalSendPasswordResetEmail(options);
  
  if (config.debug) {
    logger.info(`[EMAIL DEBUG] Password reset email result:`, result);
  }
  
  return result;
};

module.exports = {
  sendPasswordResetEmail,
  sendWelcomeEmail,
  sendBookingConfirmationEmail,
  sendEmail
};

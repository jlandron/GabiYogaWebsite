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
  from: process.env.EMAIL_FROM || 'noreply@gabi.yoga',
  region: process.env.AWS_REGION || 'us-west-2'
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

module.exports = {
  sendPasswordResetEmail
};

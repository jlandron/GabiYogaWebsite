/**
 * Email Service for Gabi Yoga Website
 * 
 * This service handles sending emails through different methods based on the environment:
 * - In development: Logs the email content to the console
 * - In production: Sends emails through Nodemailer with AWS WorkMail SMTP
 * 
 * SMTP credentials are retrieved from AWS Secrets Manager.
 */

const nodemailer = require('nodemailer');
const logger = require('./logger');
const secretsManager = require('./aws-secrets');

// Email service configuration
const config = {
  from: process.env.EMAIL_FROM || process.env.DEFAULT_SENDER || 'noreply@gabi.yoga',
  debug: process.env.EMAIL_DEBUG === 'true'
};

// Nodemailer transporter will be lazily initialized when needed
let transporter = null;
let transporterInitialized = false;
let transporterInitFailed = false;

/**
 * Initialize the Nodemailer transporter with WorkMail SMTP credentials
 * Credentials are retrieved from AWS Secrets Manager
 */
async function initializeTransporter() {
  if (transporterInitialized || transporterInitFailed) {
    return;
  }
  
  try {
    if (process.env.NODE_ENV === 'production') {
      logger.info('Initializing Nodemailer transporter with AWS WorkMail SMTP');
      
      // Get credentials from Secrets Manager
      const smtpCredentials = await secretsManager.getSmtpCredentials();
      
      // Create transporter with retrieved credentials
      transporter = nodemailer.createTransport({
        host: smtpCredentials.host,
        port: smtpCredentials.port,
        secure: smtpCredentials.secure,
        auth: {
          user: smtpCredentials.username,
          pass: smtpCredentials.password
        }
      });
      
      logger.info(`Initialized Nodemailer with WorkMail SMTP settings (${smtpCredentials.host}:${smtpCredentials.port})`);
      transporterInitialized = true;
    }
  } catch (error) {
    transporterInitFailed = true;
    logger.error('Failed to initialize Nodemailer:', error);
    logger.warn('Email sending will fall back to console logging.');
  }
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
  
  // Use the base email sending function
  const result = await sendEmail({ to, subject, htmlBody, textBody });
  
  // If there's a token, add it to the result for backward compatibility
  if (resetToken) {
    result.resetToken = resetToken;
  }
  
  return result;
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
  
  // Use the base email sending function
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
  
  // Use the base email sending function
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
  
  // In production, attempt to send email through AWS WorkMail SMTP
  if (process.env.NODE_ENV === 'production') {
    try {
      // Initialize transporter if not already done
      await initializeTransporter();
      
      // If transporter initialization failed, we'll fallback to logging
      if (transporterInitFailed || !transporter) {
        throw new Error('Transporter not available');
      }
      
      // Set up email message
      const message = {
        from: config.from,
        to: to,
        subject: subject,
        text: textBody,
        html: htmlBody
      };
      
      if (config.debug) {
        logger.info(`[EMAIL DEBUG] Sending via AWS WorkMail SMTP with params:`, JSON.stringify({
          to,
          from: config.from,
          subject
        }));
      }
      
      // Send email
      const result = await transporter.sendMail(message);
      logger.info(`Email sent to ${to} via AWS WorkMail SMTP`, { 
        messageId: result.messageId,
        response: result.response 
      });
      
      return { 
        success: true, 
        messageId: result.messageId, 
        environment: 'production', 
        method: 'workmail-smtp' 
      };
    } catch (error) {
      // Log the error but don't throw - instead fall back to logging the email content
      logger.error('Error sending email via WorkMail SMTP:', error);
      
      // Check for common WorkMail-specific errors
      if (error.message && error.message.includes('Invalid login')) {
        logger.warn('AWS WorkMail authentication failed. Check your SMTP_USER and SMTP_PASS credentials.');
        logger.info('SMTP_USER should be your full email address (e.g., noreply@gabi.yoga)');
      } else if (error.message && error.message.includes('connect')) {
        logger.warn('Connection to AWS WorkMail SMTP server failed. Check your AWS_REGION setting.');
      }
      
      logger.warn('Falling back to logging the email content instead of sending via WorkMail');
      
      // Fall back to logging the email (similar to development mode)
      logger.info(`[PROD FALLBACK EMAIL] Email for: ${to}`);
      logger.info(`[PROD FALLBACK EMAIL] Subject: ${subject}`);
      
      // Return success to prevent API error, but include fallback info
      return { 
        success: true, 
        environment: 'production', 
        method: 'fallback_log',
        error: error.message || 'WorkMail SMTP error'
      };
    }
  } else {
    // This handles both development environment and production with failed transporter init
    const environment = process.env.NODE_ENV === 'production' ? 'production-fallback' : 'development';
    logger.info(`[${environment.toUpperCase()}] Email for: ${to}`);
    logger.info(`[${environment.toUpperCase()}] Subject: ${subject}`);
    
    return { success: true, environment, method: 'log' };
  }
};

// Export all email functions
module.exports = {
  sendPasswordResetEmail,
  sendWelcomeEmail,
  sendBookingConfirmationEmail,
  sendEmail
};

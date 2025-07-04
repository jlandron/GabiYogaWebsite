/**
 * Email Service Module for Gabi Yoga
 * Handles all email communications with customers
 */

const AWS = require('aws-sdk');
const ses = new AWS.SES();

/**
 * Base email configuration
 */
const DEFAULT_SENDER = process.env.FROM_EMAIL || 'noreply@gabi.yoga';
const SITE_NAME = 'Gabi Yoga';
const YEAR = new Date().getFullYear();
const BASE_URL = process.env.BASE_URL || 
  (process.env.STAGE === 'prod' ? 'https://gabi.yoga' : 'https://j5enu5t3ik.execute-api.us-east-1.amazonaws.com/dev');

/**
 * Base function to send an email using SES
 */
async function sendEmail(params) {
  try {
    const result = await ses.sendEmail(params).promise();
    console.log('Email sent successfully:', result.MessageId);
    return result;
  } catch (error) {
    console.error('Failed to send email:', error);
    throw error;
  }
}

/**
 * Create basic email structure with text and HTML body
 */
function createEmailParams(to, subject, htmlBody, textBody, from = DEFAULT_SENDER) {
  return {
    Source: from,
    Destination: {
      ToAddresses: Array.isArray(to) ? to : [to]
    },
    Message: {
      Subject: {
        Data: subject,
        Charset: 'UTF-8'
      },
      Body: {
        Html: {
          Data: htmlBody,
          Charset: 'UTF-8'
        },
        Text: {
          Data: textBody,
          Charset: 'UTF-8'
        }
      }
    }
  };
}

/**
 * Standard email footer HTML
 */
function getEmailFooterHtml(email) {
  return `
    <div class="footer" style="text-align: center; margin-top: 30px; font-size: 14px; color: #666;">
      <p>© ${YEAR} ${SITE_NAME}. All rights reserved.</p>
      <p>This email was sent to ${email}</p>
    </div>
  `;
}

/**
 * Standard email wrapper HTML
 */
function wrapEmailHtml(content, title, subtitle = null) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; font-size: 14px; color: #666; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🧘‍♀️ ${SITE_NAME}</h1>
                ${subtitle ? `<p>${subtitle}</p>` : ''}
            </div>
            <div class="content">
                ${content}
            </div>
        </div>
    </body>
    </html>
  `;
}

/**
 * Send password reset email
 */
async function sendPasswordResetEmail(email, firstName, resetToken) {
  const resetUrl = `${BASE_URL}/reset-password.html?token=${resetToken}&email=${encodeURIComponent(email)}`;
  
  const htmlContent = `
    <h2>Hi ${firstName || 'there'},</h2>
    <p>We received a request to reset your password for your ${SITE_NAME} account.</p>
    <p>Click the button below to reset your password:</p>
    <p style="text-align: center;">
        <a href="${resetUrl}" class="button">Reset Password</a>
    </p>
    <p><strong>This link will expire in 1 hour.</strong></p>
    <p>If you didn't request this password reset, you can safely ignore this email. Your password will not be changed.</p>
    <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
    <p><small>If the button doesn't work, copy and paste this link into your browser:</small></p>
    <p><small>${resetUrl}</small></p>
    ${getEmailFooterHtml(email)}
  `;

  const textContent = `
    Reset Your ${SITE_NAME} Password
    
    Hi ${firstName || 'there'},
    
    We received a request to reset your password for your ${SITE_NAME} account.
    
    Click the link below to reset your password:
    ${resetUrl}
    
    This link will expire in 1 hour.
    
    If you didn't request this password reset, you can safely ignore this email. Your password will not be changed.
    
    © ${YEAR} ${SITE_NAME}. All rights reserved.
  `;

  const wrappedHtmlContent = wrapEmailHtml(htmlContent, `Reset Your ${SITE_NAME} Password`, 'Password Reset Request');

  const params = createEmailParams(
    email,
    `Reset Your ${SITE_NAME} Password`,
    wrappedHtmlContent,
    textContent
  );

  return sendEmail(params);
}

/**
 * Send booking confirmation email
 */
async function sendBookingConfirmationEmail(email, firstName, booking) {
  const classDate = new Date(booking.date + 'T' + booking.time).toLocaleString('en-US', { 
    weekday: 'long',
    month: 'long', 
    day: 'numeric', 
    year: 'numeric',
    hour: 'numeric',
    minute: 'numeric'
  });

  const htmlContent = `
    <h2>Hi ${firstName || 'there'},</h2>
    <p>Thank you for booking a class with ${SITE_NAME}! Your spot has been confirmed.</p>
    <div style="background-color: #eef2ff; padding: 15px; border-radius: 5px; margin: 20px 0;">
      <h3 style="margin-top: 0; color: #4b5563;">Class Details</h3>
      <p><strong>Class:</strong> ${booking.className}</p>
      <p><strong>Date & Time:</strong> ${classDate}</p>
      <p><strong>Instructor:</strong> ${booking.instructor}</p>
      <p><strong>Location:</strong> ${booking.location}</p>
      <p><strong>Level:</strong> ${booking.level}</p>
    </div>
    <h3>Preparing for your class:</h3>
    <ul>
      <li>Please arrive 10-15 minutes before the class starts</li>
      <li>Bring your own mat if you have one (we have extras if needed)</li>
      <li>Wear comfortable clothing</li>
      <li>Bring a water bottle and towel</li>
    </ul>
    <p>If you need to cancel your booking, please do so at least 2 hours before the class starts.</p>
    <p style="text-align: center;">
      <a href="${BASE_URL}/user.html#/bookings" class="button">Manage Your Bookings</a>
    </p>
    <p>We look forward to seeing you in class!</p>
    ${getEmailFooterHtml(email)}
  `;

  const textContent = `
    Booking Confirmation - ${SITE_NAME}
    
    Hi ${firstName || 'there'},
    
    Thank you for booking a class with ${SITE_NAME}! Your spot has been confirmed.
    
    Class Details:
    Class: ${booking.className}
    Date & Time: ${classDate}
    Instructor: ${booking.instructor}
    Location: ${booking.location}
    Level: ${booking.level}
    
    Preparing for your class:
    - Please arrive 10-15 minutes before the class starts
    - Bring your own mat if you have one (we have extras if needed)
    - Wear comfortable clothing
    - Bring a water bottle and towel
    
    If you need to cancel your booking, please do so at least 2 hours before the class starts.
    
    Manage your bookings here: ${BASE_URL}/user.html#/bookings
    
    We look forward to seeing you in class!
    
    © ${YEAR} ${SITE_NAME}. All rights reserved.
  `;

  const wrappedHtmlContent = wrapEmailHtml(htmlContent, `Booking Confirmation - ${SITE_NAME}`, 'Your Class is Confirmed');

  const params = createEmailParams(
    email,
    `Booking Confirmation - ${SITE_NAME}`,
    wrappedHtmlContent,
    textContent
  );

  return sendEmail(params);
}

/**
 * Send class cancellation email
 */
async function sendClassCancellationEmail(email, firstName, classInfo) {
  const classDate = new Date(classInfo.scheduleDate + 'T' + classInfo.startTime).toLocaleString('en-US', { 
    weekday: 'long',
    month: 'long', 
    day: 'numeric', 
    year: 'numeric',
    hour: 'numeric',
    minute: 'numeric'
  });

  const htmlContent = `
    <h2>Hi ${firstName || 'there'},</h2>
    <p>We're sorry to inform you that the following class has been cancelled:</p>
    <div style="background-color: #fee2e2; padding: 15px; border-radius: 5px; margin: 20px 0;">
      <h3 style="margin-top: 0; color: #ef4444;">Cancelled Class</h3>
      <p><strong>Class:</strong> ${classInfo.title}</p>
      <p><strong>Date & Time:</strong> ${classDate}</p>
      <p><strong>Instructor:</strong> ${classInfo.instructor || 'Gabi'}</p>
    </div>
    <p>This cancellation could be due to unforeseen circumstances. We apologize for any inconvenience.</p>
    <p>Please check our schedule for other available classes:</p>
    <p style="text-align: center;">
      <a href="${BASE_URL}/user.html#/classes" class="button">View Available Classes</a>
    </p>
    <p>If you have any questions, please don't hesitate to contact us.</p>
    ${getEmailFooterHtml(email)}
  `;

  const textContent = `
    Class Cancellation Notice - ${SITE_NAME}
    
    Hi ${firstName || 'there'},
    
    We're sorry to inform you that the following class has been cancelled:
    
    Cancelled Class:
    Class: ${classInfo.title}
    Date & Time: ${classDate}
    Instructor: ${classInfo.instructor || 'Gabi'}
    
    This cancellation could be due to unforeseen circumstances. We apologize for any inconvenience.
    
    Please check our schedule for other available classes: ${BASE_URL}/user.html#/classes
    
    If you have any questions, please don't hesitate to contact us.
    
    © ${YEAR} ${SITE_NAME}. All rights reserved.
  `;

  const wrappedHtmlContent = wrapEmailHtml(htmlContent, `Class Cancellation - ${SITE_NAME}`, 'Class Cancellation Notice');

  const params = createEmailParams(
    email,
    `Class Cancellation - ${SITE_NAME}`,
    wrappedHtmlContent,
    textContent
  );

  return sendEmail(params);
}

module.exports = {
  sendEmail,
  createEmailParams,
  sendPasswordResetEmail,
  sendBookingConfirmationEmail,
  sendClassCancellationEmail
};

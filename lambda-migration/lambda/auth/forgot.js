/**
 * Auth Forgot Password Lambda Function
 * Handles password reset token generation and email sending
 */

const { 
  parseEventBody,
  createSuccessResponse, 
  createErrorResponse,
  logWithContext,
  dynamoUtils,
  generateResetToken,
  isValidEmail
} = require('../shared/utils');

const AWS = require('aws-sdk');
const ses = new AWS.SES();

exports.handler = async (event, context) => {
  // Set up request ID for tracking
  const requestId = context.awsRequestId;
  
  try {
    logWithContext('info', 'Forgot password request received', { requestId });

    // Handle CORS preflight
    if (event.httpMethod === 'OPTIONS') {
      return createSuccessResponse({}, 200);
    }

    // Parse request body
    const body = parseEventBody(event);
    if (!body) {
      return createErrorResponse('Invalid request body', 400);
    }

    const { email } = body;

    // Validate input
    if (!email) {
      return createErrorResponse('Email is required', 400);
    }

    if (!isValidEmail(email)) {
      return createErrorResponse('Invalid email format', 400);
    }

    logWithContext('info', 'Processing forgot password request', { 
      requestId, 
      email: email.substring(0, 3) + '...' 
    });

    // Find user by email
    const users = await dynamoUtils.queryItems(
      process.env.USERS_TABLE,
      'EmailIndex',
      'email = :email',
      {
        ':email': email.toLowerCase()
      }
    );

    // For security, always return the same response regardless of whether email exists
    // This prevents user enumeration attacks
    const successResponse = createSuccessResponse({
      message: 'If your email exists in our system, you will receive password reset instructions shortly.'
    });

    if (!users || users.length === 0) {
      logWithContext('info', 'Password reset requested for non-existent email', { 
        requestId, 
        email: email.substring(0, 3) + '...' 
      });
      return successResponse;
    }

    const user = users[0];

    // Check if user account is active
    if (user.status !== 'active') {
      logWithContext('warn', 'Password reset requested for inactive account', { 
        requestId, 
        userId: user.id,
        status: user.status 
      });
      return successResponse; // Still return success for security
    }

    // Generate reset token
    const resetToken = generateResetToken();
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour expiry

    // Store reset token in database
    const resetRecord = {
      id: resetToken,
      userId: user.id,
      email: user.email,
      createdAt: new Date().toISOString(),
      expiresAt: resetTokenExpiry.toISOString(),
      used: false,
      type: 'password_reset'
    };

    await dynamoUtils.putItem(process.env.USERS_TABLE, {
      ...user,
      resetToken: resetToken,
      resetTokenExpiry: resetTokenExpiry.toISOString(),
      updatedAt: new Date().toISOString()
    });

    // Determine base URL for reset link
    const baseUrl = process.env.BASE_URL || 
      (process.env.STAGE === 'prod' ? 'https://gabi.yoga' : 'http://localhost:5001');
    
    const resetUrl = `${baseUrl}/reset-password.html?token=${resetToken}&email=${encodeURIComponent(email)}`;

    // Send password reset email
    try {
      await sendPasswordResetEmail(user.email, user.firstName, resetUrl, resetToken);
      
      logWithContext('info', 'Password reset email sent successfully', { 
        requestId, 
        userId: user.id 
      });
    } catch (emailError) {
      logWithContext('error', 'Failed to send password reset email', { 
        requestId, 
        userId: user.id,
        error: emailError.message 
      });
      
      // Don't reveal email sending failure to client for security
      // The reset token is still valid if they get the email through other means
    }

    return successResponse;

  } catch (error) {
    logWithContext('error', 'Forgot password error', { 
      requestId, 
      error: error.message,
      stack: error.stack 
    });

    // Return generic error message for security
    return createErrorResponse('An error occurred while processing your request', 500);
  }
};

/**
 * Send password reset email using SES
 */
async function sendPasswordResetEmail(email, firstName, resetUrl, token) {
  const subject = 'Reset Your Gabi Yoga Password';
  
  const htmlBody = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Your Password</title>
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
                <h1>🧘‍♀️ Gabi Yoga</h1>
                <p>Password Reset Request</p>
            </div>
            <div class="content">
                <h2>Hi ${firstName || 'there'},</h2>
                <p>We received a request to reset your password for your Gabi Yoga account.</p>
                <p>Click the button below to reset your password:</p>
                <p style="text-align: center;">
                    <a href="${resetUrl}" class="button">Reset Password</a>
                </p>
                <p><strong>This link will expire in 1 hour.</strong></p>
                <p>If you didn't request this password reset, you can safely ignore this email. Your password will not be changed.</p>
                <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
                <p><small>If the button doesn't work, copy and paste this link into your browser:</small></p>
                <p><small>${resetUrl}</small></p>
            </div>
            <div class="footer">
                <p>© ${new Date().getFullYear()} Gabi Yoga. All rights reserved.</p>
                <p>This email was sent to ${email}</p>
            </div>
        </div>
    </body>
    </html>
  `;

  const textBody = `
    Reset Your Gabi Yoga Password
    
    Hi ${firstName || 'there'},
    
    We received a request to reset your password for your Gabi Yoga account.
    
    Click the link below to reset your password:
    ${resetUrl}
    
    This link will expire in 1 hour.
    
    If you didn't request this password reset, you can safely ignore this email. Your password will not be changed.
    
    © ${new Date().getFullYear()} Gabi Yoga. All rights reserved.
  `;

  const params = {
    Source: process.env.FROM_EMAIL || 'noreply@gabi.yoga',
    Destination: {
      ToAddresses: [email]
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

  return ses.sendEmail(params).promise();
}

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

const emailService = require('../shared/email-service');

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
      (process.env.STAGE === 'prod' ? 'https://gabi.yoga' : 'https://j5enu5t3ik.execute-api.us-east-1.amazonaws.com/dev/');
    
    const resetUrl = `${baseUrl}/reset-password.html?token=${resetToken}&email=${encodeURIComponent(email)}`;

    // Send password reset email
    try {
      await emailService.sendPasswordResetEmail(user.email, user.firstName, resetToken);
      
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

// Send email function has been moved to the email-service module
